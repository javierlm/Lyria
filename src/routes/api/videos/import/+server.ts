import { createLibsqlVideoRepository } from '$lib/server/video';
import type {
  FavoriteVideoImportInput,
  RecentVideoImportInput,
  VideoImportPayload
} from '$lib/features/video/services/videoImportTypes';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';

function isValidRecentImport(value: unknown): value is RecentVideoImportInput {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const record = value as Partial<RecentVideoImportInput>;
  return (
    typeof record.videoId === 'string' &&
    record.videoId.length > 0 &&
    typeof record.artist === 'string' &&
    record.artist.length > 0 &&
    typeof record.track === 'string' &&
    record.track.length > 0 &&
    typeof record.timestamp === 'number' &&
    Number.isFinite(record.timestamp)
  );
}

function isValidFavoriteImport(value: unknown): value is FavoriteVideoImportInput {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const record = value as Partial<FavoriteVideoImportInput>;
  return (
    typeof record.videoId === 'string' &&
    record.videoId.length > 0 &&
    typeof record.artist === 'string' &&
    record.artist.length > 0 &&
    typeof record.track === 'string' &&
    record.track.length > 0 &&
    typeof record.addedAt === 'number' &&
    Number.isFinite(record.addedAt)
  );
}

function normalizePayload(payload: unknown): VideoImportPayload | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const body = payload as Partial<VideoImportPayload>;
  const recents = Array.isArray(body.recents) ? body.recents.filter(isValidRecentImport) : [];
  const favorites = Array.isArray(body.favorites)
    ? body.favorites.filter(isValidFavoriteImport)
    : [];

  return {
    recents,
    favorites
  };
}

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.user?.id) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rawPayload = (await request.json().catch(() => null)) as unknown;
  const payload = normalizePayload(rawPayload);

  if (!payload) {
    return json({ error: 'Invalid import payload' }, { status: 400 });
  }

  const repository = createLibsqlVideoRepository(locals.user.id);
  const result = await repository.importVideos(payload);

  return json(result);
};
