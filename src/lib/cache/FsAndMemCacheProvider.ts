import { promises as fs } from 'fs';
import path from 'path';
import type { TranslationResponse } from '../TranslationProvider';
import type { CacheProvider, CacheValue } from './CacheProvider';

const CACHE_DIR = path.join(process.cwd(), 'cache');
const CACHE_FILE = path.join(CACHE_DIR, 'translationCache.json');

export class FileSystemAndMemoryCacheProvider implements CacheProvider<TranslationResponse> {
	private cache = new Map<string, CacheValue<TranslationResponse>>();
	private saveTimeout: NodeJS.Timeout | null = null;

	async initialize(): Promise<void> {
		await this.loadCache();
	}

	async get(key: string): Promise<TranslationResponse | undefined> {
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
		value: TranslationResponse,
		opts?: { ttlMs?: number | null; meta?: Record<string, unknown> }
	): Promise<void> {
		const entry: CacheValue<TranslationResponse> = {
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

	private async loadCache(): Promise<void> {
		try {
			await fs.mkdir(CACHE_DIR, { recursive: true });
			const data = await fs.readFile(CACHE_FILE, 'utf-8');
			const parsedData = JSON.parse(data);
			this.cache = new Map<string, CacheValue<TranslationResponse>>(parsedData);
			console.log('Translation cache loaded from disk.');
		} catch (error: unknown) {
			if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
				console.log('Translation cache file not found, starting with empty cache.');
			} else {
				console.error('Error loading translation cache:', error);
			}
			this.cache = new Map<string, CacheValue<TranslationResponse>>();
		}
	}

	private async saveCache(): Promise<void> {
		try {
			await fs.mkdir(CACHE_DIR, { recursive: true });
			const data = JSON.stringify(Array.from(this.cache.entries()));
			await fs.writeFile(CACHE_FILE, data, 'utf-8');
			console.log('Translation cache saved to disk.');
		} catch (error) {
			console.error('Error saving translation cache:', error);
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
