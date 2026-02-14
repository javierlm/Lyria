import { beforeEach, describe, expect, it } from 'vitest';
import { createLibsqlVideoRepository } from '$lib/server/video';
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
});
