import { beforeEach, describe, expect, it } from 'vitest';
import { createLibsqlVideoRepository } from '$lib/server/video';
import { clearTestDatabase } from './dbTestUtils';

describe('Global search integration', () => {
  beforeEach(async () => {
    await clearTestDatabase();

    const seedUserA = createLibsqlVideoRepository('user-search-a');
    const seedUserB = createLibsqlVideoRepository('user-search-b');

    await seedUserA.addRecentVideo({
      videoId: '5anLPw0Efmo',
      artist: 'Metallica',
      track: 'Enter Sandman',
      thumbnailUrl: 'https://img.youtube.com/vi/5anLPw0Efmo/mqdefault.jpg'
    });

    await seedUserA.addRecentVideo({
      videoId: 'hTWKbfoikeg',
      artist: 'Nirvana',
      track: 'Smells Like Teen Spirit',
      thumbnailUrl: 'https://img.youtube.com/vi/hTWKbfoikeg/mqdefault.jpg'
    });

    await seedUserB.addRecentVideo({
      videoId: 'kXYiU_JCYtU',
      artist: 'Linkin Park',
      track: 'Numb',
      thumbnailUrl: 'https://img.youtube.com/vi/kXYiU_JCYtU/mqdefault.jpg'
    });

    await seedUserA.addRecentVideo({
      videoId: 'pRpeEdMmmQ0',
      artist: 'Shakira',
      track: 'Waka Waka',
      thumbnailUrl: 'https://img.youtube.com/vi/pRpeEdMmmQ0/mqdefault.jpg'
    });

    await seedUserA.addRecentVideo({
      videoId: 'IHgFJEJgUrg',
      artist: 'Bullet for My Valentine',
      track: "Tears Don't Fall",
      thumbnailUrl: 'https://img.youtube.com/vi/IHgFJEJgUrg/mqdefault.jpg'
    });

    await seedUserA.addRecentVideo({
      videoId: '8fQx-mtQhL4',
      artist: 'Mary J. Blige',
      track: 'Family Affair',
      thumbnailUrl: 'https://img.youtube.com/vi/8fQx-mtQhL4/mqdefault.jpg'
    });

    await seedUserA.addRecentVideo({
      videoId: 'SXXN2mQ4Gk0',
      artist: 'Linkin Park',
      track: 'The Emptiness Machine',
      thumbnailUrl: 'https://img.youtube.com/vi/SXXN2mQ4Gk0/mqdefault.jpg'
    });

    await seedUserA.addRecentVideo({
      videoId: 'Qf0yWQzz0gM',
      artist: 'Machine Head',
      track: 'Davidian',
      thumbnailUrl: 'https://img.youtube.com/vi/Qf0yWQzz0gM/mqdefault.jpg'
    });

    await seedUserA.addRecentVideo({
      videoId: 'v9lTn8Qw2Xp',
      artist: 'Beyond The Black',
      track: 'Rising High',
      thumbnailUrl: 'https://img.youtube.com/vi/v9lTn8Qw2Xp/mqdefault.jpg'
    });

    await seedUserA.addRecentVideo({
      videoId: 'w6Kf7uVq1Lm',
      artist: 'Arch Enemy',
      track: 'The Watcher',
      thumbnailUrl: 'https://img.youtube.com/vi/w6Kf7uVq1Lm/mqdefault.jpg'
    });

    await seedUserA.addRecentVideo({
      videoId: 'r4Pz8tYk2Qa',
      artist: 'Visions of Atlantis',
      track: 'Master the Hurricane',
      thumbnailUrl: 'https://img.youtube.com/vi/r4Pz8tYk2Qa/mqdefault.jpg'
    });

    await seedUserA.addRecentVideo({
      videoId: 'm8Qw3nXz6Bc',
      artist: 'Linkin Park',
      track: 'The Emptiness Machine Official Music Video',
      thumbnailUrl: 'https://img.youtube.com/vi/m8Qw3nXz6Bc/mqdefault.jpg'
    });

    await seedUserA.addFavoriteVideo('5anLPw0Efmo');
  });

  it('returns results for exact FTS query', async () => {
    const repository = createLibsqlVideoRepository();
    const results = await repository.searchVideos('enter sandman', 10);

    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.videoId).toBe('5anLPw0Efmo');
  });

  it('returns results for prefix token query', async () => {
    const repository = createLibsqlVideoRepository();
    const results = await repository.searchVideos('shaki', 10);

    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.videoId).toBe('pRpeEdMmmQ0');
  });

  it('keeps token order and anchor for multi-token prefixes', async () => {
    const repository = createLibsqlVideoRepository();

    const beyondTheResults = await repository.searchVideos('beyond the', 10);
    const beyondBlackResults = await repository.searchVideos('beyond black', 10);

    expect(beyondTheResults.length).toBeGreaterThan(0);
    expect(beyondTheResults[0]?.videoId).toBe('v9lTn8Qw2Xp');
    expect(beyondBlackResults.length).toBeGreaterThan(0);
    expect(beyondBlackResults[0]?.videoId).toBe('v9lTn8Qw2Xp');
  });

  it('does not let connector terms dominate exact artist matching', async () => {
    const repository = createLibsqlVideoRepository();
    const results = await repository.searchVideos('visions of atlantis', 10);

    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.videoId).toBe('r4Pz8tYk2Qa');
  });

  it('does not perform typo correction in strict FTS mode', async () => {
    const repository = createLibsqlVideoRepository();

    const typoArtistResults = await repository.searchVideos('mettalica enter sandamn', 10);
    const typoTrackResults = await repository.searchVideos('bllet for my valentine', 10);

    expect(typoArtistResults.length).toBe(0);
    expect(typoTrackResults.length).toBe(0);
  });

  it('overlays favorite and recent state for authenticated user', async () => {
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
  });

  it('keeps expected top-1 result for strict canonical queries', async () => {
    const repository = createLibsqlVideoRepository();

    const topCases: Array<{ query: string; expectedVideoId: string }> = [
      { query: 'metallica', expectedVideoId: '5anLPw0Efmo' },
      { query: 'linkin numb', expectedVideoId: 'kXYiU_JCYtU' },
      { query: 'linkin emptiness', expectedVideoId: 'SXXN2mQ4Gk0' },
      { query: 'mary blige', expectedVideoId: '8fQx-mtQhL4' },
      { query: 'beyon blac', expectedVideoId: 'v9lTn8Qw2Xp' },
      { query: 'visions atlan', expectedVideoId: 'r4Pz8tYk2Qa' },
      { query: 'arch enemy', expectedVideoId: 'w6Kf7uVq1Lm' }
    ];

    for (const testCase of topCases) {
      const results = await repository.searchVideos(testCase.query, 10);
      expect(results.length, `No results for query: ${testCase.query}`).toBeGreaterThan(0);
      expect(results[0]?.videoId, `Unexpected top video for query: ${testCase.query}`).toBe(
        testCase.expectedVideoId
      );
    }
  });
});
