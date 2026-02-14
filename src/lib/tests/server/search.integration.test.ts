import { beforeEach, describe, expect, it } from 'vitest';
import { createLibsqlVideoRepository } from '$lib/server/video';
import { clearTestDatabase } from './dbTestUtils';

describe('Global search integration', () => {
  const fuzzySupport = process.env.TEST_DB_HAS_FUZZY === '1';

  beforeEach(async () => {
    await clearTestDatabase();

    const seedUserA = createLibsqlVideoRepository('user-search-a');
    const seedUserB = createLibsqlVideoRepository('user-search-b');

    await seedUserA.addRecentVideo({
      videoId: '5anLPw0Efmo',
      artist: 'Metallica',
      track: 'Enter Sandman',
      timestamp: Date.now(),
      thumbnailUrl: 'https://img.youtube.com/vi/5anLPw0Efmo/mqdefault.jpg'
    });

    await seedUserA.addRecentVideo({
      videoId: 'hTWKbfoikeg',
      artist: 'Nirvana',
      track: 'Smells Like Teen Spirit',
      timestamp: Date.now() - 1000,
      thumbnailUrl: 'https://img.youtube.com/vi/hTWKbfoikeg/mqdefault.jpg'
    });

    await seedUserB.addRecentVideo({
      videoId: 'kXYiU_JCYtU',
      artist: 'Linkin Park',
      track: 'Numb',
      timestamp: Date.now() - 2000,
      thumbnailUrl: 'https://img.youtube.com/vi/kXYiU_JCYtU/mqdefault.jpg'
    });

    await seedUserA.addFavoriteVideo('5anLPw0Efmo');
  });

  it.skipIf(!fuzzySupport)('returns results with FTS query', async () => {
    const anonymousRepository = createLibsqlVideoRepository();
    const results = await anonymousRepository.searchVideos('sandman', 10);

    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.videoId).toBe('5anLPw0Efmo');
  });

  it.skipIf(!fuzzySupport)('returns results with SQL fuzzy search', async () => {
    const anonymousRepository = createLibsqlVideoRepository();
    const results = await anonymousRepository.searchVideos('mettalica enter sandamn', 10);

    expect(results.length).toBeGreaterThan(0);
    expect(results.some((result) => result.videoId === '5anLPw0Efmo')).toBe(true);
  });

  it.skipIf(!fuzzySupport)(
    'overlays favorite and recent state for authenticated user',
    async () => {
      const userRepository = createLibsqlVideoRepository('user-search-a');
      const userResults = await userRepository.searchVideos('metallica', 10);
      const target = userResults.find((result) => result.videoId === '5anLPw0Efmo');

      expect(target).toBeDefined();
      expect(target?.isFavorite).toBe(true);
      expect(target?.isRecent).toBe(true);

      const anonymousRepository = createLibsqlVideoRepository();
      const anonymousResults = await anonymousRepository.searchVideos('metallica', 10);
      const anonymousTarget = anonymousResults.find((result) => result.videoId === '5anLPw0Efmo');

      expect(anonymousTarget).toBeDefined();
      expect(anonymousTarget?.isFavorite).toBe(false);
    }
  );
});
