import type { NextFunction, Request, Response } from 'express';
import {
  DatabaseError,
  ForeignKeyConstraintError,
  UniqueConstraintError,
  ValidationError,
} from 'sequelize';
import config from '../config';

const hasNumber = (err: unknown, key: 'statusCode' | 'status'): number | undefined => {
  const value = (err as Record<string, unknown> | null)?.[key];
  return typeof value === 'number' ? value : undefined;
};

export default function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof UniqueConstraintError) {
    res.status(409).json({ status: 'error', message: err.errors.map((e) => e.message).join(', ') });
    return;
  }

  if (err instanceof ValidationError) {
    res.status(400).json({ status: 'error', message: err.errors.map((e) => e.message).join(', ') });
    return;
  }

  if (err instanceof ForeignKeyConstraintError) {
    res.status(400).json({ status: 'error', message: 'Referenced record does not exist' });
    return;
  }

  if (err instanceof DatabaseError && (err.parent as { code?: string }).code === '22P02') {
    res.status(400).json({ status: 'error', message: 'Invalid id or value format' });
    return;
  }

  if ((err as { type?: string } | null)?.type === 'entity.parse.failed') {
    res.status(400).json({ status: 'error', message: 'Invalid JSON body' });
    return;
  }

  const status = hasNumber(err, 'statusCode') ?? hasNumber(err, 'status') ?? 500;
  if (status >= 500) req.log.error({ err }, 'Unhandled error');

  const message = err instanceof Error ? err.message : 'Internal Server Error';
  res.status(status).json({
    status: 'error',
    message: status >= 500 && config.env === 'production' ? 'Internal Server Error' : message,
  });
}
