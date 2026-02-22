import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createLibsqlVideoRepository } from '$lib/server/video';
import { db } from '$lib/server/db/client';
import { userVideoState, videos } from '$lib/server/db/schema';
import { and, eq } from 'drizzle-orm';
import { clearTestDatabase } from './dbTestUtils';

describe('LibsqlVideoRepository integration', () => {
  const userId = 'user-integration-a';

  beforeEach(async () => {
    await clearTestDatabase();
  });

  it('stores and retrieves recent videos', async () => {
    const repository = createLibsqlVideoRepository(userId);

    await repository.addRecentVideo({
      videoId: 'dQw4w9WgXcQ',
      artist: 'Rick Astley',
      track: 'Never Gonna Give You Up',
      thumbnailUrl: 'https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg'
    });

    const recents = await repository.getRecentVideos();

    expect(recents).toHaveLength(1);
    expect(recents[0]?.videoId).toBe('dQw4w9WgXcQ');
  });

  it('deletes a recent video', async () => {
    const repository = createLibsqlVideoRepository(userId);

    await repository.addRecentVideo({
      videoId: 'dQw4w9WgXcQ',
      artist: 'Rick Astley',
      track: 'Never Gonna Give You Up',
      thumbnailUrl: 'https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg'
    });

    await repository.deleteRecentVideo('dQw4w9WgXcQ');
    const afterDelete = await repository.getRecentVideos();

    expect(afterDelete).toHaveLength(0);

    const [state] = await db
      .select({
        lastWatchedAt: userVideoState.lastWatchedAt,
        recentRemovedAt: userVideoState.recentRemovedAt
      })
      .from(userVideoState)
      .where(and(eq(userVideoState.userId, userId), eq(userVideoState.videoId, 'dQw4w9WgXcQ')))
      .limit(1);

    expect(state).toBeDefined();
    expect(state?.lastWatchedAt).toBeNull();
    expect(state?.recentRemovedAt).toBeTruthy();
  });

  it('stores and retrieves favorites', async () => {
    const repository = createLibsqlVideoRepository(userId);

    await repository.addRecentVideo({
      videoId: '3JWTaaS7LdU',
      artist: 'Adele',
      track: 'Rolling in the Deep',
      thumbnailUrl: 'https://img.youtube.com/vi/3JWTaaS7LdU/mqdefault.jpg'
    });

    await repository.addFavoriteVideo('3JWTaaS7LdU');

    expect(await repository.isFavorite('3JWTaaS7LdU')).toBe(true);

    const favorites = await repository.getFavoriteVideos();
    expect(favorites).toHaveLength(1);
    expect(favorites[0]?.videoId).toBe('3JWTaaS7LdU');
    expect(favorites[0]?.artist).toBe('Adele');
  });

  it('removes a favorite video', async () => {
    const repository = createLibsqlVideoRepository(userId);

    await repository.addFavoriteVideo('3JWTaaS7LdU', {
      videoId: '3JWTaaS7LdU',
      artist: 'Adele',
      track: 'Rolling in the Deep',
      thumbnailUrl: 'https://img.youtube.com/vi/3JWTaaS7LdU/mqdefault.jpg'
    });

    expect(await repository.isFavorite('3JWTaaS7LdU')).toBe(true);

    await repository.removeFavoriteVideo('3JWTaaS7LdU');

    expect(await repository.isFavorite('3JWTaaS7LdU')).toBe(false);

    const favorites = await repository.getFavoriteVideos();
    expect(favorites).toHaveLength(0);

    const [state] = await db
      .select({
        isFavorite: userVideoState.isFavorite,
        favoriteAddedAt: userVideoState.favoriteAddedAt,
        favoriteRemovedAt: userVideoState.favoriteRemovedAt
      })
      .from(userVideoState)
      .where(and(eq(userVideoState.userId, userId), eq(userVideoState.videoId, '3JWTaaS7LdU')))
      .limit(1);

    expect(state).toBeDefined();
    expect(state?.isFavorite).toBe(false);
    expect(state?.favoriteAddedAt).toBeNull();
    expect(state?.favoriteRemovedAt).toBeTruthy();
  });

  it('stores and retrieves video delay', async () => {
    const repository = createLibsqlVideoRepository(userId);
    const videoUrl = 'https://www.youtube.com/watch?v=9bZkp7q19f0';

    await repository.setVideoDelay(videoUrl, 420);

    expect(await repository.getVideoDelay(videoUrl)).toBe(420);
  });

  it('stores and clears manual lyric id', async () => {
    const repository = createLibsqlVideoRepository(userId);
    const videoUrl = 'https://www.youtube.com/watch?v=9bZkp7q19f0';

    await repository.setVideoLyricId(videoUrl, 123);

    expect(await repository.getVideoLyricId(videoUrl)).toBe(123);

    await repository.setVideoLyricId(videoUrl, null);

    expect(await repository.getVideoLyricId(videoUrl)).toBe(null);
  });

  it('stores custom metadata when setting manual lyric id', async () => {
    const repository = createLibsqlVideoRepository(userId);
    const videoUrl = 'https://www.youtube.com/watch?v=9bZkp7q19f0';

    await repository.setVideoLyricId(videoUrl, 123, {
      artist: 'Custom Artist',
      track: 'Custom Track'
    });

    expect(await repository.getVideoLyricId(videoUrl)).toBe(123);
  });

  it('clears custom metadata when clearing manual lyric id', async () => {
    const repository = createLibsqlVideoRepository(userId);
    const videoUrl = 'https://www.youtube.com/watch?v=9bZkp7q19f0';

    await repository.setVideoLyricId(videoUrl, 123, {
      artist: 'Custom Artist',
      track: 'Custom Track'
    });

    await repository.setVideoLyricId(videoUrl, null);

    expect(await repository.getVideoLyricId(videoUrl)).toBe(null);
  });

  it('shows custom artist/track in recent videos when set', async () => {
    const repository = createLibsqlVideoRepository(userId);

    await repository.addRecentVideo({
      videoId: 'dQw4w9WgXcQ',
      artist: 'Original Artist',
      track: 'Original Track',
      thumbnailUrl: 'https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg'
    });

    await repository.setVideoLyricId('dQw4w9WgXcQ', 123, {
      artist: 'Custom Artist',
      track: 'Custom Track'
    });

    const recents = await repository.getRecentVideos();

    expect(recents).toHaveLength(1);
    expect(recents[0]?.videoId).toBe('dQw4w9WgXcQ');
    expect(recents[0]?.artist).toBe('Custom Artist');
    expect(recents[0]?.track).toBe('Custom Track');
  });

  it('falls back to canonical artist/track when no custom metadata', async () => {
    const repository = createLibsqlVideoRepository(userId);

    await repository.addRecentVideo({
      videoId: 'dQw4w9WgXcQ',
      artist: 'Canonical Artist',
      track: 'Canonical Track',
      thumbnailUrl: 'https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg'
    });

    const recents = await repository.getRecentVideos();

    expect(recents).toHaveLength(1);
    expect(recents[0]?.videoId).toBe('dQw4w9WgXcQ');
    expect(recents[0]?.artist).toBe('Canonical Artist');
    expect(recents[0]?.track).toBe('Canonical Track');
  });

  it('shows custom artist/track in favorites when set', async () => {
    const repository = createLibsqlVideoRepository(userId);

    await repository.addRecentVideo({
      videoId: 'dQw4w9WgXcQ',
      artist: 'Original Artist',
      track: 'Original Track',
      thumbnailUrl: 'https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg'
    });

    await repository.addFavoriteVideo('dQw4w9WgXcQ');

    await repository.setVideoLyricId('dQw4w9WgXcQ', 123, {
      artist: 'Custom Favorite Artist',
      track: 'Custom Favorite Track'
    });

    const favorites = await repository.getFavoriteVideos();

    expect(favorites).toHaveLength(1);
    expect(favorites[0]?.videoId).toBe('dQw4w9WgXcQ');
    expect(favorites[0]?.artist).toBe('Custom Favorite Artist');
    expect(favorites[0]?.track).toBe('Custom Favorite Track');
  });

  it('does not overwrite canonical metadata from different users', async () => {
    const userA = 'user-a';
    const userB = 'user-b';
    const repoA = createLibsqlVideoRepository(userA);
    const repoB = createLibsqlVideoRepository(userB);

    await repoA.addRecentVideo({
      videoId: 'sharedVideo',
      artist: 'UserA Artist',
      track: 'UserA Track',
      thumbnailUrl: 'https://img.youtube.com/vi/sharedVideo/mqdefault.jpg'
    });

    await repoB.addRecentVideo({
      videoId: 'sharedVideo',
      artist: 'UserB Artist',
      track: 'UserB Track',
      thumbnailUrl: 'https://img.youtube.com/vi/sharedVideo/mqdefault.jpg'
    });

    const recentsA = await repoA.getRecentVideos();
    const recentsB = await repoB.getRecentVideos();

    expect(recentsA[0]?.artist).toBe('UserA Artist');
    expect(recentsB[0]?.artist).toBe('UserB Artist');
  });

  it('allows different custom metadata for same video per user', async () => {
    const userA = 'user-a';
    const userB = 'user-b';
    const repoA = createLibsqlVideoRepository(userA);
    const repoB = createLibsqlVideoRepository(userB);

    await repoA.addRecentVideo({
      videoId: 'sharedVideo2',
      artist: 'Canonical Artist',
      track: 'Canonical Track',
      thumbnailUrl: 'https://img.youtube.com/vi/sharedVideo2/mqdefault.jpg'
    });

    await repoB.addRecentVideo({
      videoId: 'sharedVideo2',
      artist: 'Canonical Artist',
      track: 'Canonical Track',
      thumbnailUrl: 'https://img.youtube.com/vi/sharedVideo2/mqdefault.jpg'
    });

    await repoA.setVideoLyricId('sharedVideo2', 1, {
      artist: 'UserA Custom Artist',
      track: 'UserA Custom Track'
    });

    await repoB.setVideoLyricId('sharedVideo2', 2, {
      artist: 'UserB Custom Artist',
      track: 'UserB Custom Track'
    });

    const recentsA = await repoA.getRecentVideos();
    const recentsB = await repoB.getRecentVideos();

    expect(recentsA[0]?.artist).toBe('UserA Custom Artist');
    expect(recentsA[0]?.track).toBe('UserA Custom Track');
    expect(recentsB[0]?.artist).toBe('UserB Custom Artist');
    expect(recentsB[0]?.track).toBe('UserB Custom Track');
  });

  it('does not touch canonical video updatedAt when only updating recents', async () => {
    const repository = createLibsqlVideoRepository(userId);

    await repository.addRecentVideo({
      videoId: 'immutableCanonical1',
      artist: 'Canonical Artist',
      track: 'Canonical Track',
      thumbnailUrl: 'https://img.youtube.com/vi/immutableCanonical1/mqdefault.jpg'
    });

    const [videoBefore] = await db
      .select({ updatedAt: videos.updatedAt })
      .from(videos)
      .where(eq(videos.videoId, 'immutableCanonical1'))
      .limit(1);

    expect(videoBefore?.updatedAt).toBeTruthy();

    await new Promise((resolveDelay) => setTimeout(resolveDelay, 5));

    await repository.addRecentVideo({
      videoId: 'immutableCanonical1',
      artist: 'Canonical Artist',
      track: 'Canonical Track',
      thumbnailUrl: 'https://img.youtube.com/vi/immutableCanonical1/mqdefault.jpg'
    });

    const [videoAfter] = await db
      .select({ updatedAt: videos.updatedAt })
      .from(videos)
      .where(eq(videos.videoId, 'immutableCanonical1'))
      .limit(1);

    expect(videoAfter?.updatedAt?.getTime()).toBe(videoBefore?.updatedAt?.getTime());
  });

  it('does not touch canonical video updatedAt when updating user preferences', async () => {
    const repository = createLibsqlVideoRepository(userId);

    await repository.addRecentVideo({
      videoId: 'immutableCanonical2',
      artist: 'Canonical Artist',
      track: 'Canonical Track',
      thumbnailUrl: 'https://img.youtube.com/vi/immutableCanonical2/mqdefault.jpg'
    });

    const [videoBefore] = await db
      .select({ updatedAt: videos.updatedAt })
      .from(videos)
      .where(eq(videos.videoId, 'immutableCanonical2'))
      .limit(1);

    expect(videoBefore?.updatedAt).toBeTruthy();

    await new Promise((resolveDelay) => setTimeout(resolveDelay, 5));

    await repository.setVideoDelay('immutableCanonical2', 250);
    await repository.setVideoLyricId('immutableCanonical2', 42, {
      artist: 'User Custom Artist',
      track: 'User Custom Track'
    });

    const [videoAfter] = await db
      .select({ updatedAt: videos.updatedAt })
      .from(videos)
      .where(eq(videos.videoId, 'immutableCanonical2'))
      .limit(1);

    expect(videoAfter?.updatedAt?.getTime()).toBe(videoBefore?.updatedAt?.getTime());
  });

  it('creates canonical video once from preferences without touching it on later preference changes', async () => {
    const repository = createLibsqlVideoRepository(userId);
    const videoId = 'a1b2c3d4e5F';

    await repository.setVideoDelay(videoId, 120);

    const [videoAfterFirstPreference] = await db
      .select({
        artist: videos.artist,
        track: videos.track,
        updatedAt: videos.updatedAt
      })
      .from(videos)
      .where(eq(videos.videoId, videoId))
      .limit(1);

    expect(videoAfterFirstPreference).toBeDefined();
    expect(videoAfterFirstPreference?.artist).toBe('Unknown Artist');
    expect(videoAfterFirstPreference?.track).toBe(`Video ${videoId}`);

    await new Promise((resolveDelay) => setTimeout(resolveDelay, 5));

    await repository.setVideoLyricId(videoId, 77, {
      artist: 'Personalized Artist',
      track: 'Personalized Track'
    });

    const [videoAfterSecondPreference] = await db
      .select({
        artist: videos.artist,
        track: videos.track,
        updatedAt: videos.updatedAt
      })
      .from(videos)
      .where(eq(videos.videoId, videoId))
      .limit(1);

    expect(videoAfterSecondPreference?.artist).toBe('Unknown Artist');
    expect(videoAfterSecondPreference?.track).toBe(`Video ${videoId}`);
    expect(videoAfterSecondPreference?.updatedAt?.getTime()).toBe(
      videoAfterFirstPreference?.updatedAt?.getTime()
    );
  });

  it('rolls back recents block when its transaction fails and still imports favorites block', async () => {
    const repository = createLibsqlVideoRepository(userId);
    const originalTransaction = db.transaction.bind(db);
    const transactionSpy = vi.spyOn(db, 'transaction');
    let callCount = 0;

    transactionSpy.mockImplementation(async (...args: any[]) => {
      callCount += 1;
      if (callCount === 1) {
        throw new Error('recents tx failed');
      }

      return originalTransaction(...(args as [any]));
    });

    try {
      const result = await repository.importVideos({
        recents: [
          {
            videoId: 'rollbackRecentA',
            artist: 'Artist A',
            track: 'Track A',
            timestamp: 1700000000000
          },
          {
            videoId: 'rollbackRecentB',
            artist: 'Artist B',
            track: 'Track B',
            timestamp: 1700000001000
          }
        ],
        favorites: [
          {
            videoId: 'rollbackFavoriteA',
            artist: 'Fav Artist',
            track: 'Fav Track',
            addedAt: 1700000002000
          }
        ]
      });

      expect(result.importedRecents).toBe(0);
      expect(result.importedFavorites).toBe(1);
      expect(result.failed).toBe(2);

      const recents = await repository.getRecentVideos();
      expect(recents).toHaveLength(0);

      const favorites = await repository.getFavoriteVideos();
      expect(favorites).toHaveLength(1);
      expect(favorites[0]?.videoId).toBe('rollbackFavoriteA');
    } finally {
      transactionSpy.mockRestore();
    }
  });

  it('rolls back favorites block when its transaction fails and keeps recents block imported', async () => {
    const repository = createLibsqlVideoRepository(userId);
    const originalTransaction = db.transaction.bind(db);
    const transactionSpy = vi.spyOn(db, 'transaction');

    let callCount = 0;
    transactionSpy.mockImplementation(async (...args: any[]) => {
      callCount += 1;
      if (callCount === 2) {
        throw new Error('favorites tx failed');
      }

      return originalTransaction(...(args as [any]));
    });

    try {
      const result = await repository.importVideos({
        recents: [
          {
            videoId: 'rollbackRecentC',
            artist: 'Artist C',
            track: 'Track C',
            timestamp: 1700000003000
          }
        ],
        favorites: [
          {
            videoId: 'rollbackFavoriteB',
            artist: 'Fav Artist B',
            track: 'Fav Track B',
            addedAt: 1700000004000
          },
          {
            videoId: 'rollbackFavoriteC',
            artist: 'Fav Artist C',
            track: 'Fav Track C',
            addedAt: 1700000005000
          }
        ]
      });

      expect(result.importedRecents).toBe(1);
      expect(result.importedFavorites).toBe(0);
      expect(result.failed).toBe(2);

      const recents = await repository.getRecentVideos();
      expect(recents).toHaveLength(1);
      expect(recents[0]?.videoId).toBe('rollbackRecentC');

      const favorites = await repository.getFavoriteVideos();
      expect(favorites).toHaveLength(0);
    } finally {
      transactionSpy.mockRestore();
    }
  });
});
