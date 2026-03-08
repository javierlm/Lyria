import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getSyncedLyrics, type LRCLibResponse } from '$lib/features/player/services/lrclib';

function mockLrclibSearchResponse(results: LRCLibResponse[]) {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => results
  } as Response);
}

function createCandidate(
  id: number,
  trackName: string,
  duration: number,
  artistName = 'Lord of the Lost'
): LRCLibResponse {
  return {
    id,
    name: trackName,
    trackName,
    artistName,
    albumName: 'Blood & Glitter',
    duration,
    instrumental: false,
    plainLyrics: 'line',
    syncedLyrics: '[00:00.00]line'
  };
}

describe('getSyncedLyrics automatic detection', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('rejects ambiguous title-only matches when Topic artist hint does not match', async () => {
    mockLrclibSearchResponse([
      {
        id: 1,
        name: 'Land of the Free',
        trackName: 'Land of the Free',
        artistName: 'Home Free',
        albumName: 'Land of the Free',
        duration: 273,
        instrumental: false,
        plainLyrics: 'line',
        syncedLyrics: '[00:00.00]line'
      },
      {
        id: 2,
        name: 'Land of the Free',
        trackName: 'Land of the Free',
        artistName: 'Pennywise',
        albumName: 'Land of the Free',
        duration: 273,
        instrumental: false,
        plainLyrics: 'line',
        syncedLyrics: '[00:00.00]line'
      }
    ]);

    const result = await getSyncedLyrics('The Land of the Free', '', 273, {
      artistHint: 'Visions of Atlantis - Topic'
    });

    expect(result.found).toBe(false);
    expect(result.candidates).toHaveLength(2);
  });

  it('keeps working when a candidate matches the Topic artist hint', async () => {
    mockLrclibSearchResponse([
      {
        id: 1,
        name: 'Land of the Free',
        trackName: 'Land of the Free',
        artistName: 'Home Free',
        albumName: 'Land of the Free',
        duration: 273,
        instrumental: false,
        plainLyrics: 'line',
        syncedLyrics: '[00:00.00]line'
      },
      {
        id: 2,
        name: 'The Land of the Free',
        trackName: 'The Land of the Free',
        artistName: 'Visions of Atlantis',
        albumName: 'Pirates II: Armada',
        duration: 273,
        instrumental: false,
        plainLyrics: 'line',
        syncedLyrics: null
      }
    ]);

    const result = await getSyncedLyrics('The Land of the Free', '', 273, {
      artistHint: 'Visions of Atlantis - Topic'
    });

    expect(result.found).toBe(true);
    expect(result.artistName).toBe('Visions of Atlantis');
    expect(result.trackName).toBe('The Land of the Free');
  });

  it('penalizes remix candidates when the query does not ask for a remix', async () => {
    mockLrclibSearchResponse([
      createCandidate(1, 'Blood & Glitter', 179),
      createCandidate(2, 'Blood & Glitter (Extended Version)', 242),
      createCandidate(3, 'Blood & Glitter (Faderhead Remix)', 203)
    ]);

    const result = await getSyncedLyrics('Blood & Glitter', 'Lord of the Lost', 259);

    expect(result.found).toBe(true);
    expect(result.trackName).toBe('Blood & Glitter (Extended Version)');
  });

  it('still prefers the remix when the query explicitly asks for it', async () => {
    mockLrclibSearchResponse([
      createCandidate(1, 'Blood & Glitter', 179),
      createCandidate(2, 'Blood & Glitter (Extended Version)', 242),
      createCandidate(3, 'Blood & Glitter (Faderhead Remix)', 203)
    ]);

    const result = await getSyncedLyrics(
      'Blood & Glitter (Faderhead Remix)',
      'Lord of the Lost',
      203
    );

    expect(result.found).toBe(true);
    expect(result.trackName).toBe('Blood & Glitter (Faderhead Remix)');
  });

  it('keeps extended versions almost neutral and lets duration break close ties', async () => {
    mockLrclibSearchResponse([
      createCandidate(1, 'Blood & Glitter', 179),
      createCandidate(2, 'Blood & Glitter (Extended Version)', 242)
    ]);

    const result = await getSyncedLyrics('Blood & Glitter', 'Lord of the Lost', 259);

    expect(result.found).toBe(true);
    expect(result.trackName).toBe('Blood & Glitter (Extended Version)');
  });
});
