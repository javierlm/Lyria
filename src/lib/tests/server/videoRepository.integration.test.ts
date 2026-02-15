import { beforeEach, describe, expect, it } from 'vitest';
import { createLibsqlVideoRepository } from '$lib/server/video';
import { db } from '$lib/server/db/client';
import { userVideoState } from '$lib/server/db/schema';
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
      timestamp: Date.now(),
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
      timestamp: Date.now(),
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
      timestamp: Date.now(),
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
      timestamp: Date.now(),
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
      timestamp: Date.now(),
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
      timestamp: Date.now(),
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
      timestamp: Date.now(),
      thumbnailUrl: 'https://img.youtube.com/vi/sharedVideo/mqdefault.jpg'
    });

    await repoB.addRecentVideo({
      videoId: 'sharedVideo',
      artist: 'UserB Artist',
      track: 'UserB Track',
      timestamp: Date.now(),
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
      timestamp: Date.now(),
      thumbnailUrl: 'https://img.youtube.com/vi/sharedVideo2/mqdefault.jpg'
    });

    await repoB.addRecentVideo({
      videoId: 'sharedVideo2',
      artist: 'Canonical Artist',
      track: 'Canonical Track',
      timestamp: Date.now(),
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
});
