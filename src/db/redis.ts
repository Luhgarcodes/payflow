import { createClient } from 'redis';
import config from '../config';
import { logger } from '../utils/logger';

const redisLogger = logger.child({ component: 'redis' });

export const redisClient = createClient({
  url: config.redis.url,
  socket: {
    // Stop retrying after 5 attempts so a missing Redis doesn't spam logs forever
    reconnectStrategy: (retries: number) => (retries > 5 ? false : Math.min(retries * 200, 2000)),
  },
});

export const describeError = (err: unknown): string => {
  if (err instanceof Error) return err.message || (err as NodeJS.ErrnoException).code || err.name;
  return String(err);
};

redisClient.on('error', (err: unknown) => {
  redisLogger.error({ reason: describeError(err) }, 'Redis error');
});
redisClient.on('ready', () => {
  redisLogger.info('Redis connection ready');
});
redisClient.on('end', () => {
  redisLogger.info('Redis connection closed');
});

export const isRedisReady = (): boolean => redisClient.isReady;

export async function connectRedis(): Promise<void> {
  try {
    await redisClient.connect();
  } catch (err) {
    redisLogger.warn(
      { reason: describeError(err) },
      'Could not connect to Redis, continuing without cache',
    );
  }
}

export async function disconnectRedis(): Promise<void> {
  if (redisClient.isOpen) await redisClient.quit();
}
