import { Redis } from '@upstash/redis';
import type { CacheProvider, CacheValue } from './CacheProvider';

const KEY_PREFIX = 'lyria-cache:';

export class VercelKvCacheProvider implements CacheProvider {
	private redis: Redis;
	private isInitialized = false;

	constructor() {
		this.redis = Redis.fromEnv();
	}

	async initialize(): Promise<void> {
		try {
			await this.redis.ping();
			this.isInitialized = true;
			console.log('VercelKvCacheProvider (using Upstash Redis) initialized.');
		} catch (error) {
			console.error('Failed to initialize VercelKvCacheProvider (Upstash Redis):', error);
			this.isInitialized = false;
			throw error;
		}
	}

	private getPrefixedKey(key: string): string {
		return `${KEY_PREFIX}${key}`;
	}

	async get<T>(key: string): Promise<T | undefined> {
		if (!this.isInitialized) {
			await this.initialize();
		}
		const prefixedKey = this.getPrefixedKey(key);
		const cachedData = await this.redis.get<CacheValue<T>>(prefixedKey);

		if (!cachedData) {
			return undefined;
		}

		if (cachedData.expiresAt && cachedData.expiresAt < Date.now()) {
			await this.redis.del(prefixedKey);
			return undefined;
		}

		return cachedData.value;
	}

	async set<T>(
		key: string,
		value: T,
		opts?: { ttlMs?: number | null; meta?: Record<string, unknown> }
	): Promise<void> {
		if (!this.isInitialized) {
			await this.initialize();
		}
		const prefixedKey = this.getPrefixedKey(key);
		const expiresAt = opts?.ttlMs ? Date.now() + opts.ttlMs : null;
		const cacheValue: CacheValue<T> = { value, expiresAt, meta: opts?.meta };

		const options = opts?.ttlMs ? { ex: Math.floor(opts.ttlMs / 1000) } : undefined;

		await this.redis.set(prefixedKey, cacheValue, options);
	}

	async has(key: string): Promise<boolean> {
		if (!this.isInitialized) {
			await this.initialize();
		}
		const prefixedKey = this.getPrefixedKey(key);
		const cachedData = await this.redis.get(prefixedKey);
		return cachedData !== null;
	}

	async clear(): Promise<void> {
		if (!this.isInitialized) {
			await this.initialize();
		}
		let cursor: string = '';
		do {
			const [nextCursor, keys] = await this.redis.scan(cursor, {
				match: `${KEY_PREFIX}*`,
				count: 100
			});
			cursor = nextCursor;
			if (keys.length > 0) {
				await this.redis.del(...keys);
			}
		} while (cursor !== '');
		console.log('VercelKvCacheProvider (using Upstash Redis) cleared all prefixed keys.');
	}

	async keys(): Promise<string[]> {
		if (!this.isInitialized) {
			await this.initialize();
		}
		const allKeys: string[] = [];
		let cursor: string = '';
		do {
			const [nextCursor, keys] = await this.redis.scan(cursor, {
				match: `${KEY_PREFIX}*`,
				count: 100
			});
			cursor = nextCursor;
			allKeys.push(...keys.map((key) => key.replace(KEY_PREFIX, '')));
		} while (cursor !== '');
		return allKeys;
	}

	async size(): Promise<number> {
		if (!this.isInitialized) {
			await this.initialize();
		}
		let count = 0;
		let cursor: string = '';
		do {
			const [nextCursor, keys] = await this.redis.scan(cursor, {
				match: `${KEY_PREFIX}*`,
				count: 100
			});
			cursor = nextCursor;
			count += keys.length;
		} while (cursor !== '0');
		return count;
	}
}
