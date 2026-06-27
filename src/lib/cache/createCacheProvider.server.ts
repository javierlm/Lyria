import { env } from '$env/dynamic/private';
import type { CacheProvider } from './CacheProvider';
import { FileSystemAndMemoryCacheProvider } from './FsAndMemCacheProvider';
import { VercelKvCacheProvider } from './VercelKvCacheProvider';

const providerCache = new Map<string, CacheProvider<unknown>>();

export function createCacheProvider<T = unknown>(localFileName: string): CacheProvider<T> {
  const cacheKey = env.VERCEL === '1' ? 'vercel-kv' : `fs:${localFileName}`;
  const existingProvider = providerCache.get(cacheKey);

  if (existingProvider) {
    return existingProvider as CacheProvider<T>;
  }

  const provider: CacheProvider<T> =
    env.VERCEL === '1'
      ? new VercelKvCacheProvider<T>()
      : new FileSystemAndMemoryCacheProvider<T>(localFileName);

  providerCache.set(cacheKey, provider as CacheProvider<unknown>);
  return provider;
}
