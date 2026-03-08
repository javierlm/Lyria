import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiVideoRepository } from './ApiVideoRepository';

describe('ApiVideoRepository preferences', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('fetches all video preferences in a single request', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        delay: 420,
        lyricId: 123,
        metadata: {
          artist: ' Custom Artist ',
          track: ' Custom Track '
        }
      })
    } as Response);

    const repository = new ApiVideoRepository();

    const preferences = await repository.getVideoPreferences(
      'https://www.youtube.com/watch?v=abc123XYZ89'
    );

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy).toHaveBeenCalledWith('/api/videos/preferences/abc123XYZ89', undefined);
    expect(preferences).toEqual({
      delay: 420,
      lyricId: 123,
      metadata: {
        artist: 'Custom Artist',
        track: 'Custom Track'
      }
    });
  });

  it('returns empty preferences without fetching when the video id is missing', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const repository = new ApiVideoRepository();

    const preferences = await repository.getVideoPreferences('   ');

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(preferences).toEqual({
      delay: undefined,
      lyricId: null,
      metadata: null
    });
  });
});
