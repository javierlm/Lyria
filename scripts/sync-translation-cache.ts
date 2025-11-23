#!/usr/bin/env node
/**
 * Script to synchronize translation caches between local JSON file and Upstash Redis
 *
 * Usage:
 *   pnpm tsx scripts/sync-translation-cache.ts
 *
 * Logic:
 * - If a key exists in both caches, do nothing
 * - If a key exists in only one cache, copy it to the other
 */

import { Redis } from '@upstash/redis';
import { promises as fs } from 'fs';
import path from 'path';

// Types
type TranslationResponse = {
	translatedText: string;
	detectedSourceLang?: string;
};

type CacheValue<T = unknown> = {
	value: T;
	expiresAt?: number | null;
	meta?: Record<string, unknown>;
};

// Configuration
const CACHE_DIR = path.join(process.cwd(), 'cache');
const CACHE_FILE = path.join(CACHE_DIR, 'translationCache.json');
const KEY_PREFIX = 'lyria-cache:';

// Console colors
const colors = {
	reset: '\x1b[0m',
	bright: '\x1b[1m',
	green: '\x1b[32m',
	yellow: '\x1b[33m',
	blue: '\x1b[34m',
	cyan: '\x1b[36m',
	red: '\x1b[31m'
};

function log(message: string, color?: keyof typeof colors) {
	const colorCode = color ? colors[color] : '';
	console.log(`${colorCode}${message}${colors.reset}`);
}

// Load local cache from JSON file
async function loadLocalCache(): Promise<Map<string, CacheValue<TranslationResponse>>> {
	try {
		await fs.mkdir(CACHE_DIR, { recursive: true });
		const data = await fs.readFile(CACHE_FILE, 'utf-8');
		const parsedData = JSON.parse(data) as Array<[string, CacheValue<TranslationResponse>]>;
		log(`✓ Local cache loaded: ${parsedData.length} entries`, 'green');
		return new Map<string, CacheValue<TranslationResponse>>(parsedData);
	} catch (error: unknown) {
		if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
			log('⚠ Local cache file not found, starting with empty cache', 'yellow');
		} else {
			log(`✗ Error loading local cache: ${error}`, 'red');
		}
		return new Map<string, CacheValue<TranslationResponse>>();
	}
}

// Save local cache to JSON file
async function saveLocalCache(cache: Map<string, CacheValue<TranslationResponse>>): Promise<void> {
	try {
		await fs.mkdir(CACHE_DIR, { recursive: true });
		const data = JSON.stringify(Array.from(cache.entries()), null, 2);
		await fs.writeFile(CACHE_FILE, data, 'utf-8');
		log(`✓ Local cache saved: ${cache.size} entries`, 'green');
	} catch (error) {
		log(`✗ Error saving local cache: ${error}`, 'red');
		throw error;
	}
}

// Load all Redis keys with prefix
async function loadRedisCache(redis: Redis): Promise<Map<string, CacheValue<TranslationResponse>>> {
	const redisCache = new Map<string, CacheValue<TranslationResponse>>();
	let cursor = '0';
	let totalKeys = 0;

	do {
		const [nextCursor, keys] = await redis.scan(cursor, {
			match: `${KEY_PREFIX}*`,
			count: 100
		});
		cursor = nextCursor;

		for (const prefixedKey of keys) {
			const cachedData = await redis.get<CacheValue<TranslationResponse>>(prefixedKey);
			if (cachedData) {
				// Remove prefix to get original key
				const key = prefixedKey.replace(KEY_PREFIX, '');

				// Check if entry has expired
				if (cachedData.expiresAt && cachedData.expiresAt < Date.now()) {
					log(`  ⏰ Redis entry expired, deleting: ${key}`, 'yellow');
					await redis.del(prefixedKey);
				} else {
					redisCache.set(key, cachedData);
					totalKeys++;
				}
			}
		}
	} while (cursor !== '0');

	log(`✓ Redis cache loaded: ${totalKeys} entries`, 'green');
	return redisCache;
}

// Sync caches
async function syncCaches() {
	log('\n════════════════════════════════════════════', 'bright');
	log('  Translation Cache Synchronization', 'bright');
	log('════════════════════════════════════════════\n', 'bright');

	// Initialize Redis
	log('1. Connecting to Redis...', 'cyan');
	let redis: Redis;
	try {
		redis = Redis.fromEnv();
		await redis.ping();
		log('✓ Connected to Redis', 'green');
	} catch (error) {
		log(`✗ Error connecting to Redis: ${error}`, 'red');
		log('Ensure UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN variables are set', 'yellow');
		process.exit(1);
	}

	// Load both caches
	log('\n2. Loading caches...', 'cyan');
	const localCache = await loadLocalCache();
	const redisCache = await loadRedisCache(redis);

	// Statistics
	log('\n3. Analyzing differences...', 'cyan');
	const localOnlyKeys: string[] = [];
	const redisOnlyKeys: string[] = [];
	const commonKeys: string[] = [];

	// Find keys only in local
	for (const key of localCache.keys()) {
		if (!redisCache.has(key)) {
			localOnlyKeys.push(key);
		} else {
			commonKeys.push(key);
		}
	}

	// Find keys only in Redis
	for (const key of redisCache.keys()) {
		if (!localCache.has(key)) {
			redisOnlyKeys.push(key);
		}
	}

	log(`\n📊 Summary:`, 'blue');
	log(`   • Common entries: ${commonKeys.length}`, 'blue');
	log(`   • Local only: ${localOnlyKeys.length}`, 'yellow');
	log(`   • Redis only: ${redisOnlyKeys.length}`, 'yellow');

	// Synchronize
	log('\n4. Synchronizing...', 'cyan');
	let localUpdates = 0;
	let redisUpdates = 0;

	// Copy from local to Redis
	if (localOnlyKeys.length > 0) {
		log(`\n   Copying ${localOnlyKeys.length} entries from local to Redis...`, 'yellow');
		for (const key of localOnlyKeys) {
			const value = localCache.get(key);
			if (value) {
				const prefixedKey = `${KEY_PREFIX}${key}`;
				const options = value.expiresAt
					? { ex: Math.floor((value.expiresAt - Date.now()) / 1000) }
					: undefined;

				await redis.set(prefixedKey, value, options);
				redisUpdates++;
				log(`   ✓ ${key.substring(0, 60)}...`, 'green');
			}
		}
	}

	// Copy from Redis to local
	if (redisOnlyKeys.length > 0) {
		log(`\n   Copying ${redisOnlyKeys.length} entries from Redis to local...`, 'yellow');
		for (const key of redisOnlyKeys) {
			const value = redisCache.get(key);
			if (value) {
				localCache.set(key, value);
				localUpdates++;
				log(`   ✓ ${key.substring(0, 60)}...`, 'green');
			}
		}
	}

	// Save updated local cache if there are changes
	if (localUpdates > 0) {
		log('\n5. Saving changes to local cache...', 'cyan');
		await saveLocalCache(localCache);
	}

	// Final summary
	log('\n════════════════════════════════════════════', 'bright');
	log('  ✓ Synchronization completed', 'green');
	log('════════════════════════════════════════════', 'bright');
	log(`   • Entries added to Redis: ${redisUpdates}`, 'green');
	log(`   • Entries added to local: ${localUpdates}`, 'green');
	log(`   • Total synchronized entries: ${localCache.size}\n`, 'green');
}

// Execute
syncCaches().catch((error) => {
	log(`\n✗ Error during synchronization: ${error}`, 'red');
	process.exit(1);
});
