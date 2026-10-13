import { ERROR_CATALOG, type ErrorCode } from './errorCodes';

export default class AppError extends Error {
  readonly code: ErrorCode;
  readonly statusCode: number;
  readonly details: unknown;

  constructor(code: ErrorCode, message?: string, details?: unknown) {
    const entry = ERROR_CATALOG[code];
    super(message ?? entry.message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = entry.status;
    this.details = details ?? null;
  }
}
