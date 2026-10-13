import config from '../config';
import { redisClient, isRedisReady, describeError } from '../db/redis';

// Every cache key embeds its namespace version, so invalidating a namespace is a single INCR
// and the old keys simply expire through their TTL.
const versionKey = (namespace: string): string => `cache:version:${namespace}`;

export async function getNamespaceVersion(namespace: string): Promise<number> {
  if (!isRedisReady()) return 0;
  try {
    return Number(await redisClient.get(versionKey(namespace))) || 0;
  } catch (err) {
    console.error(`[Cache] version read failed for ${namespace}:`, describeError(err));
    return 0;
  }
}

export async function invalidateNamespace(namespace: string): Promise<void> {
  if (!isRedisReady()) return;
  try {
    await redisClient.incr(versionKey(namespace));
  } catch (err) {
    console.error(`[Cache] invalidate failed for ${namespace}:`, describeError(err));
  }
}

export async function getCache<T = unknown>(key: string): Promise<T | null> {
  if (!isRedisReady()) return null;
  try {
    const value = await redisClient.get(key);
    return typeof value === 'string' ? (JSON.parse(value) as T) : null;
  } catch (err) {
    console.error(`[Cache] get failed for ${key}:`, describeError(err));
    return null;
  }
}

export async function setCache(
  key: string,
  value: unknown,
  ttl: number = config.redis.defaultTtl,
): Promise<void> {
  if (!isRedisReady()) return;
  try {
    await redisClient.set(key, JSON.stringify(value), { EX: ttl });
  } catch (err) {
    console.error(`[Cache] set failed for ${key}:`, describeError(err));
  }
}
