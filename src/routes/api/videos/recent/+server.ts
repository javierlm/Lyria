import type { RecentVideoInput } from '$lib/features/video/domain/IVideoRepository';
import { createLibsqlVideoRepository } from '$lib/server/video';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';

function isRecentVideoPayload(value: unknown): value is RecentVideoInput {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const payload = value as Partial<RecentVideoInput>;

  return (
    typeof payload.videoId === 'string' &&
    payload.videoId.length > 0 &&
    typeof payload.artist === 'string' &&
    payload.artist.length > 0 &&
    typeof payload.track === 'string' &&
    payload.track.length > 0
  );
}

export const GET: RequestHandler = async ({ locals }) => {
  if (!locals.user?.id) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const repository = createLibsqlVideoRepository(locals.user.id);
  const recents = await repository.getRecentVideos();
  return json(recents);
};

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.user?.id) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const payload = await request.json();

  if (!isRecentVideoPayload(payload)) {
    return json({ error: 'Invalid recent video payload' }, { status: 400 });
  }

  const repository = createLibsqlVideoRepository(locals.user.id);

  await repository.addRecentVideo({
    videoId: payload.videoId,
    artist: payload.artist,
    track: payload.track,
    thumbnailUrl: payload.thumbnailUrl,
    metadataSource: payload.metadataSource
  });

  return json({ ok: true });
};
