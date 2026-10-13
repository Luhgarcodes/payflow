/**
 * The single catalog of API error codes. Codes are part of the public contract: never rename or
 * reuse one. docs/openapi.yaml mirrors this list, and a test fails if they drift apart.
 */
export const ERROR_CATALOG = {
  BAD_REQUEST: { status: 400, message: 'Bad request' },
  VALIDATION_FAILED: { status: 400, message: 'Request validation failed' },
  INVALID_JSON: { status: 400, message: 'Request body is not valid JSON' },
  INVALID_CURSOR: { status: 400, message: 'Pagination cursor is invalid' },
  INVALID_AMOUNT: { status: 400, message: 'Amount is invalid' },
  INVALID_REFERENCE: { status: 400, message: 'Referenced record does not exist' },
  NOT_FOUND: { status: 404, message: 'Resource not found' },
  ROUTE_NOT_FOUND: { status: 404, message: 'Route not found' },
  USER_NOT_FOUND: { status: 404, message: 'User not found' },
  CONFLICT: { status: 409, message: 'Resource already exists' },
  EMAIL_TAKEN: { status: 409, message: 'Email already taken' },
  PHONE_TAKEN: { status: 409, message: 'Phone number already taken' },
  PAYLOAD_TOO_LARGE: { status: 413, message: 'Request body is too large' },
  INTERNAL_ERROR: { status: 500, message: 'Internal server error' },
} as const satisfies Record<string, { status: number; message: string }>;

export type ErrorCode = keyof typeof ERROR_CATALOG;

export const ERROR_CODES = Object.keys(ERROR_CATALOG) as ErrorCode[];
