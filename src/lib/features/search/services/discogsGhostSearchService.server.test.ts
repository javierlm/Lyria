import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DiscogsGhostSearchService,
  type DiscogsGhostSearchPage
} from './discogsGhostSearchService.server';

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

describe('DiscogsGhostSearchService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns deduplicated YouTube results from artist releases and masters', async () => {
    const fetchMock = vi.fn();

    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        results: [{ id: 18839, title: 'Metallica', type: 'artist' }]
      })
    );

    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        pagination: { page: 1, pages: 2 },
        releases: [
          { id: 101, type: 'release', title: 'Enter Sandman', artist: 'Metallica' },
          { id: 202, type: 'master', title: 'The Black Album', artist: 'Metallica' }
        ]
      })
    );

    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        videos: [
          {
            uri: 'https://www.youtube.com/watch?v=CD-E-LP3tQ4',
            title: 'Metallica - Enter Sandman (Official Music Video)'
          },
          {
            uri: 'https://vimeo.com/123',
            title: 'Not from YouTube'
          }
        ]
      })
    );

    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        videos: [
          {
            uri: 'https://youtu.be/CD-E-LP3tQ4',
            title: 'Duplicate video'
          },
          {
            uri: 'https://www.youtube.com/watch?v=I7JDbfKhH_E',
            title: 'Metallica - Nothing Else Matters'
          }
        ]
      })
    );

    vi.stubGlobal('fetch', fetchMock);

    const service = new DiscogsGhostSearchService({ userToken: 'discogs_token' });
    const page = await service.searchVideosPage('metallica', { limit: 10, page: 1 });

    expect(page.results).toHaveLength(2);
    expect(page.results.map((item) => item.videoId)).toEqual(['CD-E-LP3tQ4', 'I7JDbfKhH_E']);
    expect(page.results.every((item) => item.source === 'ghost')).toBe(true);
    expect(page.hasMore).toBe(true);
    expect(page.nextPage).toBe(2);

    const firstHeaders = fetchMock.mock.calls[0]?.[1]?.headers as
      | Record<string, string>
      | undefined;
    expect(firstHeaders?.Authorization).toBe('Discogs token=discogs_token');
  });

  it('returns empty page when artist cannot be resolved', async () => {
    const fetchMock = vi.fn();
    fetchMock.mockResolvedValueOnce(jsonResponse({ results: [] }));
    vi.stubGlobal('fetch', fetchMock);

    const service = new DiscogsGhostSearchService({ userToken: 'discogs_token' });
    const page = await service.searchVideosPage('unknown artist', { page: 1, limit: 15 });

    const expected: DiscogsGhostSearchPage = {
      results: [],
      hasMore: false,
      nextPage: 1
    };

    expect(page).toEqual(expected);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('does not resolve shorter prefix artist for single-token artist queries', async () => {
    const fetchMock = vi.fn();

    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        results: [
          { id: 11, title: 'Night', type: 'artist' },
          { id: 22, title: 'Nightfall', type: 'artist' }
        ]
      })
    );

    vi.stubGlobal('fetch', fetchMock);

    const service = new DiscogsGhostSearchService({ userToken: 'discogs_token' });
    const page = await service.searchVideosPage('Nightwish', {
      page: 1,
      limit: 15,
      intent: 'artist'
    });

    expect(page.results).toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
