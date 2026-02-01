#!/usr/bin/env node
/**
 * Script to manually update the Song of the Day in local development
 * Usage: pnpm tsx scripts/update-song-of-the-day.ts
 */

import { SongOfTheDayService } from '../src/lib/features/song-of-the-day/services/SongOfTheDayService';

async function main() {
  console.log('🎵 Updating Song of the Day (local development)...\n');

  try {
    const service = new SongOfTheDayService();
    const song = await service.updateSongOfTheDay();

    if (song) {
      console.log('\n✅ Success! Song of the Day updated:');
      console.log(`   🎤 Artist: ${song.artist}`);
      console.log(`   🎵 Track: ${song.track}`);
      console.log(`   🎬 Video ID: ${song.videoId}`);
      console.log(`   🔗 YouTube: https://youtube.com/watch?v=${song.videoId}`);
      process.exit(0);
    } else {
      console.error('\n❌ Failed: No song found for today');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

await main();
