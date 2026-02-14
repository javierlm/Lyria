import { createLibsqlVideoRepository } from '$lib/server/video';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ locals }) => {
  if (!locals.user?.id) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const repository = createLibsqlVideoRepository(locals.user.id);
  const favorites = await repository.getFavoriteVideos();
  return json(favorites);
};
