import AppError from './AppError';

export default function requireFields(
  body: unknown,
  fields: readonly string[],
): asserts body is Record<string, unknown> {
  if (!body || typeof body !== 'object') throw AppError.badRequest('Missing JSON body');

  const record = body as Record<string, unknown>;
  const missing = fields.filter(
    (field) => record[field] === undefined || record[field] === null || record[field] === '',
  );
  if (missing.length) {
    throw AppError.badRequest(
      `${missing.join(', ')} ${missing.length > 1 ? 'are' : 'is'} required`,
    );
  }
}
