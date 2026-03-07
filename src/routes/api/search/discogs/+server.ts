import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { DISCOGS_USER_TOKEN } from '$env/static/private';
import {
  DiscogsGhostSearchService,
  type DiscogsSearchIntent,
  DiscogsRateLimitError
} from '$lib/features/search/services/discogsGhostSearchService.server';

const DEFAULT_LIMIT = 15;
const MAX_LIMIT = 30;
const MIN_QUERY_LENGTH = 3;

const discogsService = DISCOGS_USER_TOKEN?.trim()
  ? new DiscogsGhostSearchService({ userToken: DISCOGS_USER_TOKEN })
  : null;

function parseNumber(value: string | null, fallback: number): number {
  const parsed = Number(value ?? fallback);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return parsed;
}

function parseIntent(value: string | null): DiscogsSearchIntent {
  if (value === 'artist' || value === 'track' || value === 'artist_track' || value === 'mixed') {
    return value;
  }

  return 'artist';
}

export const GET: RequestHandler = async ({ url, request }) => {
  const query = url.searchParams.get('q')?.trim() ?? '';
  const intent = parseIntent(url.searchParams.get('intent'));
  const artistTerm = url.searchParams.get('artist')?.trim() ?? '';
  const trackTerm = url.searchParams.get('track')?.trim() ?? '';
  const rawPage = parseNumber(url.searchParams.get('page'), 1);
  const rawLimit = parseNumber(url.searchParams.get('limit'), DEFAULT_LIMIT);

  const page = Math.max(1, Math.floor(rawPage));
  const limit = Math.max(1, Math.min(Math.floor(rawLimit), MAX_LIMIT));

  if (query.length < MIN_QUERY_LENGTH || !discogsService) {
    return json({
      results: [],
      hasMore: false,
      nextPage: page
    });
  }

  try {
    const pageResults = await discogsService.searchVideosPage(query, {
      page,
      limit,
      intent,
      artistTerm,
      trackTerm,
      signal: request.signal
    });
    return json(pageResults);
  } catch (error) {
    if (error instanceof DiscogsRateLimitError) {
      const retryAfterSeconds = Math.max(1, Math.ceil(error.retryAfterMs / 1000));

      return json(
        {
          results: [],
          hasMore: false,
          nextPage: page,
          rateLimited: true,
          retryAfterMs: error.retryAfterMs
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(retryAfterSeconds)
          }
        }
      );
    }

    console.error('Discogs search failed:', error);

    return json({
      results: [],
      hasMore: false,
      nextPage: page
    });
  }
};
