import { createLibsqlVideoRepository } from '$lib/server/video';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';

const DEFAULT_LIMIT = 30;

export const GET: RequestHandler = async ({ url, locals }) => {
  const query = url.searchParams.get('q')?.trim() ?? '';
  const rawLimit = Number(url.searchParams.get('limit') ?? DEFAULT_LIMIT);
  const limit = Number.isFinite(rawLimit) ? rawLimit : DEFAULT_LIMIT;

  if (query.length < 2) {
    return json([]);
  }

  const repository = createLibsqlVideoRepository(locals.user?.id);
  const results = await repository.searchVideos(query, limit);
  return json(results);
};
