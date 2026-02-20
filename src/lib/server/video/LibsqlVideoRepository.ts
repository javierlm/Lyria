import { db, libsqlClient } from '$lib/server/db/client';
import { userVideoState, videos } from '$lib/server/db/schema';
import { BaseVideoRepository } from '$lib/features/video/domain/BaseVideoRepository';
import type { FavoriteVideo, RecentVideo } from '$lib/features/video/domain/IVideoRepository';
import { extractVideoId, isValidYouTubeId } from '$lib/shared/utils';
import { and, desc, eq, isNotNull } from 'drizzle-orm';

const MAX_RECENT_VIDEOS = 100;
const DEFAULT_SEARCH_LIMIT = 30;
const MAX_SEARCH_LIMIT = 60;

export interface SearchVideoResult {
  videoId: string;
  artist: string;
  track: string;
  thumbnailUrl?: string;
  isFavorite: boolean;
  isRecent: boolean;
  lastWatchedAt: number | null;
}

interface VideoMetadata {
  videoId: string;
  artist: string;
  track: string;
  thumbnailUrl?: string;
}

interface SearchRow {
  videoId: string;
  artist: string;
  track: string;
  thumbnailUrl: string | null;
  isFavorite: number | boolean | null;
  lastWatchedAt: number | null;
}

interface NormalizedVideoFields {
  artistNormalized: string;
  trackNormalized: string;
  searchTextNormalized: string;
}

function normalizeSearchText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildNormalizedVideoFields(artist: string, track: string): NormalizedVideoFields {
  const artistNormalized = normalizeSearchText(artist);
  const trackNormalized = normalizeSearchText(track);

  return {
    artistNormalized,
    trackNormalized,
    searchTextNormalized: `${artistNormalized} ${trackNormalized}`.trim()
  };
}

function resolveVideoId(videoInput: string): string | null {
  const extracted = extractVideoId(videoInput);
  if (extracted) {
    return extracted;
  }

  const trimmed = videoInput.trim();
  return isValidYouTubeId(trimmed) ? trimmed : null;
}

function buildFtsQuery(normalizedQuery: string): string {
  const allTerms = normalizedQuery
    .split(' ')
    .filter((term) => term.length > 0)
    .slice(0, 6);

  // For multi-word queries, filter out very short terms (<= 3 chars) if we have longer terms
  // This prevents matching on common words like "the", "and", "of" etc.
  const significantTerms = allTerms.filter((term) => term.length > 3);
  const termsToUse = significantTerms.length > 0 ? significantTerms : allTerms;

  const terms = termsToUse
    .map((term) => term.replace(/[^a-z0-9]/g, ''))
    .filter((term) => term.length > 0)
    .map((term) => `"${term}"*`);

  if (terms.length === 0) {
    return '';
  }

  return terms.join(' AND ');
}

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  const numeric = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function toBooleanFlag(value: unknown): boolean {
  if (value === true) {
    return true;
  }

  if (value === false || value === null || value === undefined) {
    return false;
  }

  return toNumber(value) === 1;
}

function toSearchResult(row: SearchRow): SearchVideoResult {
  const lastWatchedAt = toNumber(row.lastWatchedAt);

  return {
    videoId: row.videoId,
    artist: row.artist,
    track: row.track,
    thumbnailUrl: row.thumbnailUrl ?? undefined,
    isFavorite: toBooleanFlag(row.isFavorite),
    isRecent: lastWatchedAt !== null,
    lastWatchedAt
  };
}

export class LibsqlVideoRepository extends BaseVideoRepository {
  constructor(private readonly userId?: string) {
    super();
  }

  private requireUserId(): string {
    if (!this.userId) {
      throw new Error('User context is required for this operation');
    }

    return this.userId;
  }

  close(): void {
    // Stateless repository; connection lifecycle is managed globally
  }

  private isPlaceholderValue(artist: string, track: string): boolean {
    return artist === 'Unknown Artist' || track.startsWith('Video ');
  }

  private async upsertVideo(metadata: VideoMetadata): Promise<void> {
    const artist = metadata.artist.trim() || 'Unknown Artist';
    const track = metadata.track.trim() || 'Unknown Track';
    const normalizedFields = buildNormalizedVideoFields(artist, track);

    // Check if video already exists and has non-placeholder values
    const existing = await db
      .select({ artist: videos.artist, track: videos.track })
      .from(videos)
      .where(eq(videos.videoId, metadata.videoId))
      .limit(1);

    const hasExisting = existing.length > 0;
    const isPlaceholder =
      hasExisting && this.isPlaceholderValue(existing[0].artist, existing[0].track);
    const shouldUpdate = !hasExisting || isPlaceholder;

    await db
      .insert(videos)
      .values({
        videoId: metadata.videoId,
        artist,
        track,
        thumbnailUrl: metadata.thumbnailUrl,
        artistNormalized: normalizedFields.artistNormalized,
        trackNormalized: normalizedFields.trackNormalized,
        searchTextNormalized: normalizedFields.searchTextNormalized,
        updatedAt: new Date()
      })
      .onConflictDoUpdate({
        target: videos.videoId,
        set: shouldUpdate
          ? {
              artist,
              track,
              thumbnailUrl: metadata.thumbnailUrl,
              artistNormalized: normalizedFields.artistNormalized,
              trackNormalized: normalizedFields.trackNormalized,
              searchTextNormalized: normalizedFields.searchTextNormalized,
              updatedAt: new Date()
            }
          : {
              thumbnailUrl: metadata.thumbnailUrl,
              updatedAt: new Date()
            }
      });
  }

  private async ensureVideoExists(videoId: string): Promise<void> {
    const existing = await db
      .select({ videoId: videos.videoId })
      .from(videos)
      .where(eq(videos.videoId, videoId))
      .limit(1);

    if (existing.length > 0) {
      return;
    }

    await this.upsertVideo({
      videoId,
      artist: 'Unknown Artist',
      track: `Video ${videoId}`,
      thumbnailUrl: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`
    });
  }

  private async resolveExistingVideoId(videoInput: string): Promise<string | null> {
    const resolved = resolveVideoId(videoInput);
    if (resolved) {
      return resolved;
    }

    const trimmed = videoInput.trim();
    if (!trimmed) {
      return null;
    }

    const existing = await db
      .select({ videoId: videos.videoId })
      .from(videos)
      .where(eq(videos.videoId, trimmed))
      .limit(1);

    return existing[0]?.videoId ?? null;
  }

  async addRecentVideo(video: RecentVideo): Promise<void> {
    const userId = this.requireUserId();

    await this.upsertVideo({
      videoId: video.videoId,
      artist: video.artist,
      track: video.track,
      thumbnailUrl: video.thumbnailUrl
    });

    const watchedAt = new Date(video.timestamp || Date.now());
    const customNormalizedFields = buildNormalizedVideoFields(video.artist, video.track);

    await db
      .insert(userVideoState)
      .values({
        userId,
        videoId: video.videoId,
        lastWatchedAt: watchedAt,
        recentRemovedAt: null,
        customArtist: video.artist,
        customTrack: video.track,
        customArtistNormalized: customNormalizedFields.artistNormalized,
        customTrackNormalized: customNormalizedFields.trackNormalized,
        customSearchTextNormalized: customNormalizedFields.searchTextNormalized,
        customMetadataAt: watchedAt,
        updatedAt: new Date()
      })
      .onConflictDoUpdate({
        target: [userVideoState.userId, userVideoState.videoId],
        set: {
          lastWatchedAt: watchedAt,
          recentRemovedAt: null,
          customArtist: video.artist,
          customTrack: video.track,
          customArtistNormalized: customNormalizedFields.artistNormalized,
          customTrackNormalized: customNormalizedFields.trackNormalized,
          customSearchTextNormalized: customNormalizedFields.searchTextNormalized,
          customMetadataAt: watchedAt,
          updatedAt: new Date()
        }
      });

    await libsqlClient.execute({
      sql: `
        WITH ranked AS (
          SELECT
            id,
            ROW_NUMBER() OVER (ORDER BY last_watched_at DESC) AS rn
          FROM user_video_state
          WHERE user_id = ? AND last_watched_at IS NOT NULL
        )
        UPDATE user_video_state
        SET
          last_watched_at = NULL,
          updated_at = cast(unixepoch('subsecond') * 1000 as integer)
        WHERE id IN (
          SELECT id
          FROM ranked
          WHERE rn > ?
        )
      `,
      args: [userId, MAX_RECENT_VIDEOS]
    });
  }

  async getRecentVideos(): Promise<RecentVideo[]> {
    const userId = this.requireUserId();

    const rows = await db
      .select({
        videoId: videos.videoId,
        artist: videos.artist,
        track: videos.track,
        customArtist: userVideoState.customArtist,
        customTrack: userVideoState.customTrack,
        thumbnailUrl: videos.thumbnailUrl,
        lastWatchedAt: userVideoState.lastWatchedAt
      })
      .from(userVideoState)
      .innerJoin(videos, eq(userVideoState.videoId, videos.videoId))
      .where(and(eq(userVideoState.userId, userId), isNotNull(userVideoState.lastWatchedAt)))
      .orderBy(desc(userVideoState.lastWatchedAt))
      .limit(MAX_RECENT_VIDEOS);

    return rows.map((row) => ({
      videoId: row.videoId,
      artist: row.customArtist ?? row.artist,
      track: row.customTrack ?? row.track,
      timestamp: row.lastWatchedAt?.getTime() ?? Date.now(),
      thumbnailUrl: row.thumbnailUrl ?? undefined
    }));
  }

  async deleteRecentVideo(videoId: string): Promise<void> {
    const userId = this.requireUserId();
    const now = new Date();

    await db
      .update(userVideoState)
      .set({
        lastWatchedAt: null,
        recentRemovedAt: now,
        updatedAt: now
      })
      .where(and(eq(userVideoState.userId, userId), eq(userVideoState.videoId, videoId)));
  }

  async addFavoriteVideo(videoId: string, metadata?: VideoMetadata): Promise<void> {
    const userId = this.requireUserId();

    if (metadata) {
      await this.upsertVideo(metadata);
    } else {
      await this.ensureVideoExists(videoId);
    }

    const now = new Date();

    await db
      .insert(userVideoState)
      .values({
        userId,
        videoId,
        isFavorite: true,
        favoriteAddedAt: now,
        favoriteRemovedAt: null,
        updatedAt: now
      })
      .onConflictDoUpdate({
        target: [userVideoState.userId, userVideoState.videoId],
        set: {
          isFavorite: true,
          favoriteAddedAt: now,
          favoriteRemovedAt: null,
          updatedAt: now
        }
      });
  }

  async removeFavoriteVideo(videoId: string): Promise<void> {
    const userId = this.requireUserId();
    const now = new Date();

    await db
      .update(userVideoState)
      .set({
        isFavorite: false,
        favoriteAddedAt: null,
        favoriteRemovedAt: now,
        updatedAt: now
      })
      .where(and(eq(userVideoState.userId, userId), eq(userVideoState.videoId, videoId)));
  }

  async getFavoriteVideos(): Promise<FavoriteVideo[]> {
    const userId = this.requireUserId();

    const rows = await db
      .select({
        videoId: videos.videoId,
        artist: videos.artist,
        track: videos.track,
        customArtist: userVideoState.customArtist,
        customTrack: userVideoState.customTrack,
        thumbnailUrl: videos.thumbnailUrl,
        favoriteAddedAt: userVideoState.favoriteAddedAt,
        lastWatchedAt: userVideoState.lastWatchedAt
      })
      .from(userVideoState)
      .innerJoin(videos, eq(userVideoState.videoId, videos.videoId))
      .where(and(eq(userVideoState.userId, userId), eq(userVideoState.isFavorite, true)))
      .orderBy(desc(userVideoState.favoriteAddedAt));

    return rows.map((row) => {
      const addedAt = row.favoriteAddedAt?.getTime() ?? Date.now();

      return {
        videoId: row.videoId,
        artist: row.customArtist ?? row.artist,
        track: row.customTrack ?? row.track,
        timestamp: row.lastWatchedAt?.getTime() ?? addedAt,
        addedAt,
        thumbnailUrl: row.thumbnailUrl ?? undefined
      };
    });
  }

  async isFavorite(videoId: string): Promise<boolean> {
    const userId = this.requireUserId();

    const row = await db
      .select({ isFavorite: userVideoState.isFavorite })
      .from(userVideoState)
      .where(and(eq(userVideoState.userId, userId), eq(userVideoState.videoId, videoId)))
      .limit(1);

    return row[0]?.isFavorite ?? false;
  }

  async setVideoDelay(videoInput: string, delay: number): Promise<void> {
    const userId = this.requireUserId();

    const videoId = await this.resolveExistingVideoId(videoInput);
    if (!videoId) {
      return;
    }

    await this.ensureVideoExists(videoId);

    await db
      .insert(userVideoState)
      .values({
        userId,
        videoId,
        delayMs: delay,
        updatedAt: new Date()
      })
      .onConflictDoUpdate({
        target: [userVideoState.userId, userVideoState.videoId],
        set: {
          delayMs: delay,
          updatedAt: new Date()
        }
      });
  }

  async getVideoDelay(videoInput: string): Promise<number | undefined> {
    const userId = this.requireUserId();

    const videoId = await this.resolveExistingVideoId(videoInput);
    if (!videoId) {
      return undefined;
    }

    const row = await db
      .select({ delayMs: userVideoState.delayMs })
      .from(userVideoState)
      .where(and(eq(userVideoState.userId, userId), eq(userVideoState.videoId, videoId)))
      .limit(1);

    const delay = row[0]?.delayMs;
    if (!delay) {
      return undefined;
    }

    return delay;
  }

  async setVideoLyricId(
    videoInput: string,
    lyricId: number | null,
    metadata?: { artist?: string; track?: string }
  ): Promise<void> {
    const userId = this.requireUserId();

    const videoId = await this.resolveExistingVideoId(videoInput);
    if (!videoId) {
      return;
    }

    await this.ensureVideoExists(videoId);

    const hasMetadata = metadata?.artist && metadata?.track;
    const customFields = hasMetadata
      ? {
          customArtist: metadata!.artist!,
          customTrack: metadata!.track!,
          customArtistNormalized: normalizeSearchText(metadata!.artist!),
          customTrackNormalized: normalizeSearchText(metadata!.track!),
          customSearchTextNormalized: buildNormalizedVideoFields(
            metadata!.artist!,
            metadata!.track!
          ).searchTextNormalized,
          customMetadataAt: new Date()
        }
      : null;

    await db
      .insert(userVideoState)
      .values({
        userId,
        videoId,
        manualLyricId: lyricId,
        ...(customFields ?? {}),
        updatedAt: new Date()
      })
      .onConflictDoUpdate({
        target: [userVideoState.userId, userVideoState.videoId],
        set: {
          manualLyricId: lyricId,
          ...(lyricId === null
            ? {
                customArtist: null,
                customTrack: null,
                customArtistNormalized: null,
                customTrackNormalized: null,
                customSearchTextNormalized: null,
                customMetadataAt: null
              }
            : (customFields ?? {})),
          updatedAt: new Date()
        }
      });
  }

  async getVideoLyricId(videoInput: string): Promise<number | null> {
    const userId = this.requireUserId();

    const videoId = await this.resolveExistingVideoId(videoInput);
    if (!videoId) {
      return null;
    }

    const row = await db
      .select({ manualLyricId: userVideoState.manualLyricId })
      .from(userVideoState)
      .where(and(eq(userVideoState.userId, userId), eq(userVideoState.videoId, videoId)))
      .limit(1);

    return row[0]?.manualLyricId ?? null;
  }

  async searchVideos(query: string, limit = DEFAULT_SEARCH_LIMIT): Promise<SearchVideoResult[]> {
    const normalizedQuery = normalizeSearchText(query);
    if (!normalizedQuery || normalizedQuery.length < 2) {
      return [];
    }

    const safeLimit = Math.max(1, Math.min(limit, MAX_SEARCH_LIMIT));
    const userIdArg = this.userId ?? null;
    const exactVideoId = resolveVideoId(query) ?? '';
    const ftsQuery = buildFtsQuery(normalizedQuery);
    if (!ftsQuery && !exactVideoId) {
      return [];
    }

    const rows = await libsqlClient.execute({
      sql: `
        WITH
        exact_results AS (
          SELECT
            v.video_id AS videoId,
            v.artist AS artist,
            v.track AS track,
            v.thumbnail_url AS thumbnailUrl,
            u.is_favorite AS isFavorite,
            u.last_watched_at AS lastWatchedAt,
            0 AS priority,
            NULL AS bm25Score
          FROM videos v
          LEFT JOIN user_video_state u ON u.video_id = v.video_id AND u.user_id = ?
          WHERE ? <> '' AND v.video_id = ?
          LIMIT 1
        ),
        fts_results AS (
          SELECT
            v.video_id AS videoId,
            v.artist AS artist,
            v.track AS track,
            v.thumbnail_url AS thumbnailUrl,
            u.is_favorite AS isFavorite,
            u.last_watched_at AS lastWatchedAt,
            1 AS priority,
            bm25(videos_fts) AS bm25Score
          FROM videos_fts
          JOIN videos v ON v.rowid = videos_fts.rowid
          LEFT JOIN user_video_state u ON u.video_id = v.video_id AND u.user_id = ?
          WHERE ? <> '' AND videos_fts MATCH ?
          ORDER BY bm25(videos_fts) ASC
          LIMIT ?
        ),
        combined AS (
          SELECT videoId, artist, track, thumbnailUrl, isFavorite, lastWatchedAt, priority, bm25Score FROM exact_results
          UNION ALL
          SELECT videoId, artist, track, thumbnailUrl, isFavorite, lastWatchedAt, priority, bm25Score FROM fts_results
        ),
        ranked AS (
          SELECT
            videoId,
            artist,
            track,
            thumbnailUrl,
            isFavorite,
            lastWatchedAt,
            priority,
            bm25Score,
            ROW_NUMBER() OVER (
              PARTITION BY videoId
              ORDER BY priority ASC, COALESCE(bm25Score, 0.0) ASC, COALESCE(lastWatchedAt, 0) DESC
            ) AS rn
          FROM combined
        )
        SELECT
          videoId,
          artist,
          track,
          thumbnailUrl,
          isFavorite,
          lastWatchedAt
        FROM ranked
        WHERE rn = 1
        ORDER BY priority ASC, COALESCE(bm25Score, 0.0) ASC, COALESCE(lastWatchedAt, 0) DESC
        LIMIT ?
      `,
      args: [
        userIdArg,
        exactVideoId,
        exactVideoId,
        userIdArg,
        ftsQuery,
        ftsQuery,
        safeLimit * 2,
        safeLimit
      ]
    });

    return rows.rows.map((row) => toSearchResult(row as unknown as SearchRow));
  }
}

export function createLibsqlVideoRepository(userId?: string): LibsqlVideoRepository {
  return new LibsqlVideoRepository(userId);
}
