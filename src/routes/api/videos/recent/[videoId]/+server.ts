import { createLibsqlVideoRepository } from '$lib/server/video';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';

export const DELETE: RequestHandler = async ({ params, locals }) => {
  if (!locals.user?.id) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const videoId = params.videoId;
  if (!videoId) {
    return json({ error: 'Video id is required' }, { status: 400 });
  }

  const repository = createLibsqlVideoRepository(locals.user.id);
  await repository.deleteRecentVideo(videoId);
  return json({ ok: true });
};
