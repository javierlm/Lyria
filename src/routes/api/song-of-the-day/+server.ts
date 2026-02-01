import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { SongOfTheDayService } from '$lib/features/song-of-the-day/services/SongOfTheDayService';

export const GET: RequestHandler = async () => {
  try {
    const service = new SongOfTheDayService();
    const song = await service.getSongOfTheDay();

    if (song) {
      return json(song);
    } else {
      return json({ error: 'No song of the day available' }, { status: 404 });
    }
  } catch (error) {
    console.error('Error getting song of the day:', error);
    return json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
};
