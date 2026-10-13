import type { Request, RequestHandler } from 'express';
import config from '../config';
import { getNamespaceVersion, getCache, setCache } from '../cache';

export type CacheScope = 'public' | 'user';

export interface CacheOptions {
  scope: CacheScope;
  ttl?: number;
}

/**
 * Caches successful JSON GET responses.
 * scope 'public': one shared entry per URL. Only for responses that are identical for every caller.
 * scope 'user':   one entry per authenticated user (req.user.id). Anonymous requests are not cached.
 */
export const cache = (
  namespace: string,
  { scope, ttl = config.redis.defaultTtl }: CacheOptions,
): RequestHandler<Request['params'], unknown, unknown, object> => {
  return async (req, res, next) => {
    if (req.method !== 'GET') {
      next();
      return;
    }

    const userId = req.user?.id;
    if (scope === 'user' && !userId) {
      next();
      return;
    }

    const version = await getNamespaceVersion(namespace);
    const owner = scope === 'user' ? `user:${userId}` : 'public';
    const key = `cache:${namespace}:v${version}:${owner}:${req.originalUrl}`;

    const cached = await getCache(key);
    if (cached) {
      res.set('X-Cache', 'HIT');
      res.json(cached);
      return;
    }

    res.set('X-Cache', 'MISS');
    const originalJson = res.json.bind(res);
    res.json = (body: unknown) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        void setCache(key, body, ttl);
      }
      return originalJson(body);
    };
    next();
  };
};
