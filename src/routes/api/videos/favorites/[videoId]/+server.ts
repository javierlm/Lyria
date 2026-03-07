import {
  FAVORITES_LIMIT_ERROR_CODE,
  FavoritesLimitError
} from '$lib/features/video/domain/videoRepositoryErrors';
import { createLibsqlVideoRepository } from '$lib/server/video';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';

interface FavoriteMetadataPayload {
  artist?: string;
  track?: string;
  thumbnailUrl?: string;
}

function normalizeMetadata(
  payload: FavoriteMetadataPayload,
  videoId: string
): { videoId: string; artist: string; track: string; thumbnailUrl?: string } | undefined {
  if (!payload.artist || !payload.track) {
    return undefined;
  }

  return {
    videoId,
    artist: payload.artist,
    track: payload.track,
    thumbnailUrl: payload.thumbnailUrl
  };
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
  const isFavorite = await repository.isFavorite(videoId);
  return json({ isFavorite });
};

export const POST: RequestHandler = async ({ request, params, locals }) => {
  if (!locals.user?.id) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const videoId = params.videoId;
  if (!videoId) {
    return json({ error: 'Video id is required' }, { status: 400 });
  }

  const payload = (await request.json().catch(() => ({}))) as FavoriteMetadataPayload;
  const metadata = normalizeMetadata(payload, videoId);

  const repository = createLibsqlVideoRepository(locals.user.id);

  try {
    await repository.addFavoriteVideo(videoId, metadata);
  } catch (error) {
    if (error instanceof FavoritesLimitError) {
      return json(
        { error: error.message, code: FAVORITES_LIMIT_ERROR_CODE, limit: error.limit },
        { status: 409 }
      );
    }

    throw error;
  }

  return json({ ok: true });
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
  if (!locals.user?.id) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const videoId = params.videoId;
  if (!videoId) {
    return json({ error: 'Video id is required' }, { status: 400 });
  }

  const repository = createLibsqlVideoRepository(locals.user.id);
  await repository.removeFavoriteVideo(videoId);
  return json({ ok: true });
};
