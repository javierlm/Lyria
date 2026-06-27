import { promises as fs } from 'fs';
import path from 'path';
import type { CacheProvider, CacheValue } from './CacheProvider';

const CACHE_DIR = path.join(process.cwd(), 'cache');

export class FileSystemAndMemoryCacheProvider<T = unknown> implements CacheProvider<T> {
  private cache = new Map<string, CacheValue<T>>();
  private saveTimeout: NodeJS.Timeout | null = null;

  constructor(private readonly fileName = 'translationCache.json') {}

  async initialize(): Promise<void> {
    await this.loadCache();
  }

  async get(key: string): Promise<T | undefined> {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    if (entry.expiresAt && entry.expiresAt < Date.now()) {
      this.cache.delete(key);
      this.debounceSaveCache();
      return undefined;
    }

    return entry.value;
  }

  async set(
    key: string,
    value: T,
    opts?: { ttlMs?: number | null; meta?: Record<string, unknown> }
  ): Promise<void> {
    const entry: CacheValue<T> = {
      value,
      expiresAt: opts?.ttlMs ? Date.now() + opts.ttlMs : null,
      meta: opts?.meta
    };
    this.cache.set(key, entry);
    this.debounceSaveCache();
  }

  async has(key: string): Promise<boolean> {
    return (await this.get(key)) !== undefined;
  }

  async clear(): Promise<void> {
    this.cache.clear();
    this.debounceSaveCache();
  }

  async keys(): Promise<string[]> {
    return Array.from(this.cache.keys());
  }

  async size(): Promise<number> {
    return this.cache.size;
  }

  private get cacheFile(): string {
    return path.join(CACHE_DIR, this.fileName);
  }

  private async loadCache(): Promise<void> {
    try {
      await fs.mkdir(CACHE_DIR, { recursive: true });
      const data = await fs.readFile(this.cacheFile, 'utf-8');
      const parsedData = JSON.parse(data);
      this.cache = new Map<string, CacheValue<T>>(parsedData);
      console.log(`Cache loaded from disk: ${this.fileName}`);
    } catch (error: unknown) {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
        console.log(`Cache file not found, starting with empty cache: ${this.fileName}`);
      } else {
        console.error(`Error loading cache ${this.fileName}:`, error);
      }
      this.cache = new Map<string, CacheValue<T>>();
    }
  }

  private async saveCache(): Promise<void> {
    try {
      await fs.mkdir(CACHE_DIR, { recursive: true });
      const data = JSON.stringify(Array.from(this.cache.entries()));
      await fs.writeFile(this.cacheFile, data, 'utf-8');
      console.log(`Cache saved to disk: ${this.fileName}`);
    } catch (error) {
      console.error(`Error saving cache ${this.fileName}:`, error);
    }
  }

  private debounceSaveCache(): void {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    this.saveTimeout = setTimeout(() => {
      this.saveCache();
    }, 1000);
  }
}
