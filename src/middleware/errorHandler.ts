import type { NextFunction, Request, Response } from 'express';
import {
  DatabaseError,
  ForeignKeyConstraintError,
  UniqueConstraintError,
  ValidationError,
} from 'sequelize';
import config from '../config';
import AppError from '../utils/AppError';
import type { ErrorCode } from '../utils/errorCodes';

export interface ErrorBody {
  status: 'error';
  code: ErrorCode;
  message: string;
  details: unknown;
}

const UNIQUE_FIELD_CODES: Partial<Record<string, ErrorCode>> = {
  email: 'EMAIL_TAKEN',
  phone_no: 'PHONE_TAKEN',
};

const readProp = (err: unknown, key: string): unknown =>
  typeof err === 'object' && err !== null ? (err as Record<string, unknown>)[key] : undefined;

/** Maps anything thrown in a request to an AppError with a catalog code. */
export const toAppError = (err: unknown): AppError => {
  if (err instanceof AppError) return err;

  if (err instanceof UniqueConstraintError) {
    const code = Object.keys(err.fields)
      .map((key) => UNIQUE_FIELD_CODES[key])
      .find((value) => value !== undefined);
    return new AppError(code ?? 'CONFLICT');
  }

  if (err instanceof ValidationError) {
    const details = err.errors.map((e) => ({ field: e.path ?? '', message: e.message }));
    return new AppError('VALIDATION_FAILED', undefined, details);
  }

  if (err instanceof ForeignKeyConstraintError) return new AppError('INVALID_REFERENCE');

  if (err instanceof DatabaseError && readProp(err.parent, 'code') === '22P02') {
    return new AppError('BAD_REQUEST', 'Invalid id or value format');
  }

  // body-parser errors carry a `type` and an HTTP status.
  const type = readProp(err, 'type');
  if (type === 'entity.parse.failed') return new AppError('INVALID_JSON');
  if (type === 'entity.too.large') return new AppError('PAYLOAD_TOO_LARGE');

  const status = readProp(err, 'statusCode') ?? readProp(err, 'status');
  if (typeof status === 'number' && status >= 400 && status < 500) {
    return new AppError('BAD_REQUEST', err instanceof Error ? err.message : undefined);
  }

  return new AppError('INTERNAL_ERROR', err instanceof Error ? err.message : undefined);
};

export default function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const appError = toAppError(err);

  if (appError.statusCode >= 500) {
    req.log.error({ err }, 'Unhandled error');
  }

  const body: ErrorBody = {
    status: 'error',
    code: appError.code,
    message:
      appError.statusCode >= 500 && config.env === 'production'
        ? 'Internal server error'
        : appError.message,
    details: appError.details,
  };
  res.status(appError.statusCode).json(body);
}
