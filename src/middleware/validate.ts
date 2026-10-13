import type { Request, RequestHandler } from 'express';
import type { z } from 'zod';
import AppError from '../utils/AppError';

export interface RequestSchemas {
  params?: z.ZodType;
  query?: z.ZodType;
  body?: z.ZodType;
}

export interface FieldError {
  field: string;
  message: string;
}

type Parsed<S, K extends keyof RequestSchemas, Fallback> = K extends keyof S
  ? S[K] extends z.ZodType
    ? z.output<S[K]>
    : Fallback
  : Fallback;

/** Handler whose params, body and query are the outputs of the given schemas. */
export type ValidatedHandler<S extends RequestSchemas> = RequestHandler<
  Parsed<S, 'params', Request['params']>,
  unknown,
  Parsed<S, 'body', unknown>,
  Parsed<S, 'query', Request['query']>
>;

const LOCATIONS = ['params', 'query', 'body'] as const;

/**
 * Parses params, query and body against Zod schemas and replaces them with the parsed values,
 * so the handlers after it receive exactly what the schemas produced. All failures are
 * collected into one 400 VALIDATION_FAILED response with field-level details.
 */
export const validate =
  <S extends RequestSchemas>(schemas: S): ValidatedHandler<S> =>
  (req, _res, next) => {
    const details: FieldError[] = [];

    for (const location of LOCATIONS) {
      const schema = schemas[location];
      if (!schema) continue;

      const result = schema.safeParse(req[location] ?? {});
      if (!result.success) {
        for (const issue of result.error.issues) {
          details.push({
            field: [location, ...issue.path.map(String)].join('.'),
            message: issue.message,
          });
        }
        continue;
      }

      // Express 5 exposes req.query through a getter, so it has to be redefined, not assigned.
      Object.defineProperty(req, location, {
        value: result.data,
        writable: true,
        enumerable: true,
        configurable: true,
      });
    }

    if (details.length > 0) {
      next(new AppError('VALIDATION_FAILED', undefined, details));
      return;
    }
    next();
  };
