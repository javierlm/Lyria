import { createLibsqlVideoRepository } from '$lib/server/video';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';

interface PreferencesPayload {
  delay?: number;
  lyricId?: number | null;
  metadata?: { artist?: string; track?: string };
}

export const GET: RequestHandler = async ({ params, locals }) => {
  if (!locals.user?.id) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const videoId = params.videoId;
  if (!videoId) {
    return json({ error: 'Video id is required' }, { status: 400 });
  }

  const repository = createLibsqlVideoRepository(locals.user.id);
  const [delay, lyricId] = await Promise.all([
    repository.getVideoDelay(videoId),
    repository.getVideoLyricId(videoId)
  ]);

  return json({ delay, lyricId });
};

export const POST: RequestHandler = async ({ request, params, locals }) => {
  if (!locals.user?.id) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const videoId = params.videoId;
  if (!videoId) {
    return json({ error: 'Video id is required' }, { status: 400 });
  }

  const payload = (await request.json()) as PreferencesPayload;
  const hasDelay = payload.delay !== undefined;
  const hasLyricId = payload.lyricId !== undefined;

  if (!hasDelay && !hasLyricId) {
    return json({ error: 'At least one preference is required' }, { status: 400 });
  }

  if (hasDelay && (typeof payload.delay !== 'number' || !Number.isFinite(payload.delay))) {
    return json({ error: 'Invalid delay value' }, { status: 400 });
  }

  if (
    hasLyricId &&
    payload.lyricId !== null &&
    (typeof payload.lyricId !== 'number' || !Number.isInteger(payload.lyricId))
  ) {
    return json({ error: 'Invalid lyricId value' }, { status: 400 });
  }

  const repository = createLibsqlVideoRepository(locals.user.id);

  if (hasDelay) {
    await repository.setVideoDelay(videoId, payload.delay as number);
  }

  if (hasLyricId) {
    await repository.setVideoLyricId(videoId, payload.lyricId ?? null, payload.metadata);
  }

  const [delay, lyricId] = await Promise.all([
    repository.getVideoDelay(videoId),
    repository.getVideoLyricId(videoId)
  ]);

  return json({ delay, lyricId });
};
