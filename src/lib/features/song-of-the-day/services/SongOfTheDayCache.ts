import { promises as fs } from 'node:fs';
import path from 'node:path';
import { Redis } from '@upstash/redis';
import type { SongOfTheDayStored } from '../domain/SongOfTheDay';

const CACHE_DIR = path.join(process.cwd(), 'cache');
const LOCAL_CACHE_FILE = path.join(CACHE_DIR, 'songOfDay.json');
const KV_KEY = 'song-of-the-day';

export class SongOfTheDayCache {
  private readonly isProduction: boolean;
  private readonly redis: Redis | null = null;

  constructor() {
    this.isProduction = process.env.VERCEL === '1';
    if (this.isProduction) {
      this.redis = Redis.fromEnv();
    }
  }

  /**
   * Get the current song of the day
   * Returns null if not found or expired
   */
  async get(): Promise<SongOfTheDayStored | null> {
    if (this.isProduction) {
      return this.getFromKV();
    } else {
      return this.getFromLocalFile();
    }
  }

  /**
   * Save the song of the day
   */
  async set(song: SongOfTheDayStored): Promise<void> {
    if (this.isProduction) {
      await this.setToKV(song);
    } else {
      await this.setToLocalFile(song);
    }
  }

  /**
   * Clear the current song (for testing purposes)
   */
  async clear(): Promise<void> {
    if (this.isProduction) {
      await this.clearKV();
    } else {
      await this.clearLocalFile();
    }
  }

  private async getFromKV(): Promise<SongOfTheDayStored | null> {
    try {
      if (!this.redis) return null;
      const data = await this.redis.get<SongOfTheDayStored>(KV_KEY);
      return data;
    } catch (error) {
      console.error('KV get error:', error);
      return null;
    }
  }

  private async setToKV(song: SongOfTheDayStored): Promise<void> {
    try {
      if (!this.redis) throw new Error('Redis not initialized');
      await this.redis.set(KV_KEY, song);
    } catch (error) {
      console.error('KV set error:', error);
      throw error;
    }
  }

  private async clearKV(): Promise<void> {
    try {
      if (!this.redis) return;
      await this.redis.del(KV_KEY);
    } catch (error) {
      console.error('KV clear error:', error);
    }
  }

  private async getFromLocalFile(): Promise<SongOfTheDayStored | null> {
    try {
      await fs.mkdir(CACHE_DIR, { recursive: true });
      const data = await fs.readFile(LOCAL_CACHE_FILE, 'utf-8');
      const parsed = JSON.parse(data) as SongOfTheDayStored;
      return parsed;
    } catch (error: unknown) {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
        console.log('No local cache file found');
        return null;
      }
      console.error('Local file get error:', error);
      return null;
    }
  }

  private async setToLocalFile(song: SongOfTheDayStored): Promise<void> {
    try {
      await fs.mkdir(CACHE_DIR, { recursive: true });
      await fs.writeFile(LOCAL_CACHE_FILE, JSON.stringify(song, null, 2), 'utf-8');
    } catch (error) {
      console.error('Local file set error:', error);
      throw error;
    }
  }

  private async clearLocalFile(): Promise<void> {
    try {
      await fs.unlink(LOCAL_CACHE_FILE);
    } catch (error: unknown) {
      if (error instanceof Error && 'code' in error && error.code !== 'ENOENT') {
        console.error('Local file clear error:', error);
      }
    }
  }
}
