export type CacheValue<T = unknown> = {
  value: T;
  expiresAt?: number | null;
  meta?: Record<string, unknown>;
};

export interface CacheProvider<T = unknown> {
  get(key: string): Promise<T | undefined>;
  set(
    key: string,
    value: T,
    opts?: { ttlMs?: number | null; meta?: Record<string, unknown> }
  ): Promise<void>;
  has(key: string): Promise<boolean>;
  clear(): Promise<void>;
  keys(): Promise<string[]>;
  size(): Promise<number>;
  initialize(): Promise<void>;
}
