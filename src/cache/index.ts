import config from '../config';
import { redisClient, isRedisReady, describeError } from '../db/redis';
import { logger } from '../utils/logger';

const cacheLogger = logger.child({ component: 'cache' });

// Every cache key embeds its namespace version, so invalidating a namespace is a single INCR
// and the old keys simply expire through their TTL.
const versionKey = (namespace: string): string => `cache:version:${namespace}`;

export async function getNamespaceVersion(namespace: string): Promise<number> {
  if (!isRedisReady()) return 0;
  try {
    return Number(await redisClient.get(versionKey(namespace))) || 0;
  } catch (err) {
    cacheLogger.error({ namespace, reason: describeError(err) }, 'Cache version read failed');
    return 0;
  }
}

export async function invalidateNamespace(namespace: string): Promise<void> {
  if (!isRedisReady()) return;
  try {
    await redisClient.incr(versionKey(namespace));
  } catch (err) {
    cacheLogger.error({ namespace, reason: describeError(err) }, 'Cache invalidation failed');
  }
}

export async function getCache<T = unknown>(key: string): Promise<T | null> {
  if (!isRedisReady()) return null;
  try {
    const value = await redisClient.get(key);
    return typeof value === 'string' ? (JSON.parse(value) as T) : null;
  } catch (err) {
    cacheLogger.error({ key, reason: describeError(err) }, 'Cache get failed');
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
    cacheLogger.error({ key, reason: describeError(err) }, 'Cache set failed');
  }
}
