import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';
import { SongOfTheDayService } from '$lib/features/song-of-the-day/services/SongOfTheDayService';

export const GET: RequestHandler = async ({ request }) => {
  const authHeader = request.headers.get('authorization');
  const expectedSecret = env.CRON_SECRET;

  if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const service = new SongOfTheDayService();
    const song = await service.updateSongOfTheDay();

    if (song) {
      return json({
        success: true,
        song: {
          track: song.track,
          artist: song.artist,
          videoId: song.videoId
        }
      });
    } else {
      return json(
        {
          success: false,
          error: 'No song found for today'
        },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error('Cron job error:', error);
    return json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
};
