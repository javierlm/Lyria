import { db, libsqlClient } from '$lib/server/db/client';
import { userVideoState, videos } from '$lib/server/db/schema';
import { BaseVideoRepository } from '$lib/features/video/domain/BaseVideoRepository';
import type { FavoriteVideo, RecentVideo } from '$lib/features/video/domain/IVideoRepository';
import { extractVideoId, isValidYouTubeId } from '$lib/shared/utils';
import { and, desc, eq, inArray, isNotNull } from 'drizzle-orm';

const MAX_RECENT_VIDEOS = 100;
const DEFAULT_SEARCH_LIMIT = 30;
const MAX_SEARCH_LIMIT = 60;
const FUZZY_JAROWIN_THRESHOLD = 0.84;
const FUZZY_DAMLEV_THRESHOLD = 4;
const FUZZY_SOURCE_LIMIT_MULTIPLIER = 4;

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
  const terms = normalizedQuery
    .split(' ')
    .filter((term) => term.length > 0)
    .slice(0, 6)
    .map((term) => `${term.replace(/"/g, '')}*`);

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

  private async upsertVideo(metadata: VideoMetadata): Promise<void> {
    const artist = metadata.artist.trim() || 'Unknown Artist';
    const track = metadata.track.trim() || 'Unknown Track';
    const normalizedFields = buildNormalizedVideoFields(artist, track);

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
        set: {
          artist,
          track,
          thumbnailUrl: metadata.thumbnailUrl,
          artistNormalized: normalizedFields.artistNormalized,
          trackNormalized: normalizedFields.trackNormalized,
          searchTextNormalized: normalizedFields.searchTextNormalized,
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

  async addRecentVideo(video: RecentVideo): Promise<void> {
    const userId = this.requireUserId();

    await this.upsertVideo({
      videoId: video.videoId,
      artist: video.artist,
      track: video.track,
      thumbnailUrl: video.thumbnailUrl
    });

    const watchedAt = new Date(video.timestamp || Date.now());

    await db
      .insert(userVideoState)
      .values({
        userId,
        videoId: video.videoId,
        lastWatchedAt: watchedAt,
        updatedAt: new Date()
      })
      .onConflictDoUpdate({
        target: [userVideoState.userId, userVideoState.videoId],
        set: {
          lastWatchedAt: watchedAt,
          updatedAt: new Date()
        }
      });

    const recents = await db
      .select({ id: userVideoState.id })
      .from(userVideoState)
      .where(and(eq(userVideoState.userId, userId), isNotNull(userVideoState.lastWatchedAt)))
      .orderBy(desc(userVideoState.lastWatchedAt))
      .limit(MAX_RECENT_VIDEOS + 200);

    if (recents.length > MAX_RECENT_VIDEOS) {
      const staleIds = recents.slice(MAX_RECENT_VIDEOS).map((row) => row.id);

      await db
        .update(userVideoState)
        .set({
          lastWatchedAt: null,
          updatedAt: new Date()
        })
        .where(inArray(userVideoState.id, staleIds));
    }
  }

  async getRecentVideos(): Promise<RecentVideo[]> {
    const userId = this.requireUserId();

    const rows = await db
      .select({
        videoId: videos.videoId,
        artist: videos.artist,
        track: videos.track,
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
      artist: row.artist,
      track: row.track,
      timestamp: row.lastWatchedAt?.getTime() ?? Date.now(),
      thumbnailUrl: row.thumbnailUrl ?? undefined
    }));
  }

  async deleteRecentVideo(videoId: string): Promise<void> {
    const userId = this.requireUserId();

    await db
      .update(userVideoState)
      .set({
        lastWatchedAt: null,
        updatedAt: new Date()
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
        updatedAt: now
      })
      .onConflictDoUpdate({
        target: [userVideoState.userId, userVideoState.videoId],
        set: {
          isFavorite: true,
          favoriteAddedAt: now,
          updatedAt: now
        }
      });
  }

  async removeFavoriteVideo(videoId: string): Promise<void> {
    const userId = this.requireUserId();

    await db
      .update(userVideoState)
      .set({
        isFavorite: false,
        favoriteAddedAt: null,
        updatedAt: new Date()
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
        artist: row.artist,
        track: row.track,
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

    const videoId = resolveVideoId(videoInput);
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

    const videoId = resolveVideoId(videoInput);
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

  async setVideoLyricId(videoInput: string, lyricId: number | null): Promise<void> {
    const userId = this.requireUserId();

    const videoId = resolveVideoId(videoInput);
    if (!videoId) {
      return;
    }

    await this.ensureVideoExists(videoId);

    await db
      .insert(userVideoState)
      .values({
        userId,
        videoId,
        manualLyricId: lyricId,
        updatedAt: new Date()
      })
      .onConflictDoUpdate({
        target: [userVideoState.userId, userVideoState.videoId],
        set: {
          manualLyricId: lyricId,
          updatedAt: new Date()
        }
      });
  }

  async getVideoLyricId(videoInput: string): Promise<number | null> {
    const userId = this.requireUserId();

    const videoId = resolveVideoId(videoInput);
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

    const normalizedTokens = normalizedQuery.split(' ').filter((token) => token.length > 0);
    if (normalizedTokens.length === 0) {
      return [];
    }

    const safeLimit = Math.max(1, Math.min(limit, MAX_SEARCH_LIMIT));
    const perSourceLimit = safeLimit * FUZZY_SOURCE_LIMIT_MULTIPLIER;
    const recentFallbackLimit = Math.max(safeLimit, 20);
    const userIdArg = this.userId ?? null;
    const exactVideoId = resolveVideoId(query) ?? '';
    const ftsQuery = buildFtsQuery(normalizedQuery);
    const firstToken = normalizedTokens[0];
    const fuzzyEnabled = normalizedQuery.length >= 3 ? 1 : 0;

    const rows = await libsqlClient.execute({
      sql: `
        WITH exact_results AS (
          SELECT
            v.video_id AS videoId,
            v.artist AS artist,
            v.track AS track,
            v.thumbnail_url AS thumbnailUrl,
            u.is_favorite AS isFavorite,
            u.last_watched_at AS lastWatchedAt,
            4000.0 AS score,
            0 AS priority
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
            (1000.0 - bm25(videos_fts)) AS score,
            1 AS priority
          FROM videos_fts
          JOIN videos v ON v.rowid = videos_fts.rowid
          LEFT JOIN user_video_state u ON u.video_id = v.video_id AND u.user_id = ?
          WHERE ? <> '' AND videos_fts MATCH ?
          ORDER BY bm25(videos_fts) ASC
          LIMIT ?
        ),
        prefix_results AS (
          SELECT
            v.video_id AS videoId,
            v.artist AS artist,
            v.track AS track,
            v.thumbnail_url AS thumbnailUrl,
            u.is_favorite AS isFavorite,
            u.last_watched_at AS lastWatchedAt,
            200.0 AS score,
            2 AS priority
          FROM videos v
          LEFT JOIN user_video_state u ON u.video_id = v.video_id AND u.user_id = ?
          WHERE ? <> ''
            AND (
              v.search_text_normalized LIKE (? || '%')
              OR v.search_text_normalized LIKE ('% ' || ? || '%')
            )
          ORDER BY v.updated_at DESC
          LIMIT ?
        ),
        recent_results AS (
          SELECT
            v.video_id AS videoId,
            v.artist AS artist,
            v.track AS track,
            v.thumbnail_url AS thumbnailUrl,
            u.is_favorite AS isFavorite,
            u.last_watched_at AS lastWatchedAt,
            20.0 AS score,
            4 AS priority
          FROM videos v
          LEFT JOIN user_video_state u ON u.video_id = v.video_id AND u.user_id = ?
          ORDER BY v.updated_at DESC
          LIMIT ?
        ),
        candidate_pool AS (
          SELECT videoId FROM exact_results
          UNION
          SELECT videoId FROM fts_results
          UNION
          SELECT videoId FROM prefix_results
          UNION
          SELECT videoId FROM recent_results
        ),
        fuzzy_raw AS (
          SELECT
            v.video_id AS videoId,
            v.artist AS artist,
            v.track AS track,
            v.thumbnail_url AS thumbnailUrl,
            u.is_favorite AS isFavorite,
            u.last_watched_at AS lastWatchedAt,
            fuzzy_jarowin(
              fuzzy_translit(lower(v.artist || ' ' || v.track)),
              fuzzy_translit(lower(?))
            ) AS jarowin,
            fuzzy_damlev(
              fuzzy_translit(lower(v.artist || ' ' || v.track)),
              fuzzy_translit(lower(?))
            ) AS damlev,
            CASE WHEN ? <> '' AND lower(v.video_id) = lower(?) THEN 1 ELSE 0 END AS exactId
          FROM videos v
          INNER JOIN candidate_pool cp ON cp.videoId = v.video_id
          LEFT JOIN user_video_state u ON u.video_id = v.video_id AND u.user_id = ?
        ),
        fuzzy_results AS (
          SELECT
            videoId,
            artist,
            track,
            thumbnailUrl,
            isFavorite,
            lastWatchedAt,
            (jarowin * 120.0) - (damlev * 3.0) + (exactId * 300.0) AS score,
            3 AS priority
          FROM fuzzy_raw
          WHERE ? = 1 AND (jarowin >= ? OR damlev <= ? OR exactId = 1)
          ORDER BY score DESC
          LIMIT ?
        ),
        combined AS (
          SELECT videoId, artist, track, thumbnailUrl, isFavorite, lastWatchedAt, score, priority
          FROM exact_results
          UNION ALL
          SELECT videoId, artist, track, thumbnailUrl, isFavorite, lastWatchedAt, score, priority
          FROM fts_results
          UNION ALL
          SELECT videoId, artist, track, thumbnailUrl, isFavorite, lastWatchedAt, score, priority
          FROM prefix_results
          UNION ALL
          SELECT videoId, artist, track, thumbnailUrl, isFavorite, lastWatchedAt, score, priority
          FROM fuzzy_results
        ),
        ranked AS (
          SELECT
            videoId,
            artist,
            track,
            thumbnailUrl,
            isFavorite,
            lastWatchedAt,
            score,
            priority,
            ROW_NUMBER() OVER (
              PARTITION BY videoId
              ORDER BY score DESC, priority ASC, COALESCE(lastWatchedAt, 0) DESC
            ) AS rn
          FROM combined
        )
        SELECT videoId, artist, track, thumbnailUrl, isFavorite, lastWatchedAt
        FROM ranked
        WHERE rn = 1
        ORDER BY score DESC, COALESCE(lastWatchedAt, 0) DESC
        LIMIT ?
      `,
      args: [
        userIdArg,
        exactVideoId,
        exactVideoId,
        userIdArg,
        ftsQuery,
        ftsQuery,
        perSourceLimit,
        userIdArg,
        firstToken,
        firstToken,
        firstToken,
        perSourceLimit,
        userIdArg,
        recentFallbackLimit,
        normalizedQuery,
        normalizedQuery,
        exactVideoId,
        exactVideoId,
        userIdArg,
        fuzzyEnabled,
        FUZZY_JAROWIN_THRESHOLD,
        FUZZY_DAMLEV_THRESHOLD,
        perSourceLimit,
        safeLimit
      ]
    });

    return rows.rows.map((row) => toSearchResult(row as unknown as SearchRow));
  }
}

export function createLibsqlVideoRepository(userId?: string): LibsqlVideoRepository {
  return new LibsqlVideoRepository(userId);
}
