import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { pinoHttp } from 'pino-http';
import { logger } from '../utils/logger';

export const REQUEST_ID_HEADER = 'X-Request-Id';

const SAFE_REQUEST_ID = /^[\w-]{1,128}$/;

const resolveRequestId = (req: IncomingMessage, res: ServerResponse): string => {
  const incoming = req.headers['x-request-id'];
  const id =
    typeof incoming === 'string' && SAFE_REQUEST_ID.test(incoming) ? incoming : randomUUID();
  res.setHeader(REQUEST_ID_HEADER, id);
  return id;
};

/**
 * Assigns every request an ID (reusing a well-formed incoming X-Request-Id), echoes it in the
 * response header, and attaches `req.log`, a child logger that stamps the ID on every line.
 */
export const requestId = pinoHttp({
  logger,
  genReqId: resolveRequestId,
  customLogLevel: (_req, res, err) => {
    if (err || res.statusCode >= 500) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
  serializers: {
    req: (req: { id: unknown; method: unknown; url: unknown }) => ({
      id: req.id,
      method: req.method,
      url: req.url,
    }),
    res: (res: { statusCode: unknown }) => ({ statusCode: res.statusCode }),
  },
});
