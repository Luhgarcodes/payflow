import { createHmac, timingSafeEqual } from 'node:crypto';
import { Op, type Order, type WhereOptions } from 'sequelize';
import { z } from 'zod';
import config from '../config';
import AppError from './AppError';

/**
 * Keyset pagination over (created_at DESC, id DESC) for append-only lists.
 *
 * The created_at column must have millisecond precision (TIMESTAMP(3)): cursors carry a JS Date,
 * and a microsecond column would make rows sharing a millisecond fall between pages.
 */

export interface CursorPosition {
  createdAt: Date;
  id: string;
}

export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}

export const paginationQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().min(1).max(512).optional(),
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

export const CURSOR_ORDER: Order = [
  ['createdAt', 'DESC'],
  ['id', 'DESC'],
];

const cursorPayloadSchema = z.tuple([z.iso.datetime(), z.string().min(1).max(64)]);

const sign = (payload: string): string =>
  createHmac('sha256', config.cursorSecret).update(payload).digest('base64url');

const invalidCursor = (): AppError => new AppError('INVALID_CURSOR');

export const encodeCursor = ({ createdAt, id }: CursorPosition): string => {
  const payload = Buffer.from(JSON.stringify([createdAt.toISOString(), id])).toString('base64url');
  return `${payload}.${sign(payload)}`;
};

export const decodeCursor = (cursor: string): CursorPosition => {
  const [payload, signature, ...rest] = cursor.split('.');
  if (!payload || !signature || rest.length > 0) throw invalidCursor();

  const expected = Buffer.from(sign(payload));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) {
    throw invalidCursor();
  }

  let decoded: unknown;
  try {
    decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  } catch {
    throw invalidCursor();
  }

  const parsed = cursorPayloadSchema.safeParse(decoded);
  if (!parsed.success) throw invalidCursor();
  const [createdAt, id] = parsed.data;
  return { createdAt: new Date(createdAt), id };
};

/** WHERE clause for rows strictly after the cursor in CURSOR_ORDER; empty for the first page. */
export const afterCursor = (cursor: string | undefined): WhereOptions => {
  if (!cursor) return {};
  const { createdAt, id } = decodeCursor(cursor);
  return {
    [Op.or]: [{ createdAt: { [Op.lt]: createdAt } }, { createdAt, id: { [Op.lt]: id } }],
  };
};

/** Expects `limit + 1` rows ordered by CURSOR_ORDER; the extra row only signals a next page. */
export const toPage = <T extends CursorPosition>(rows: T[], limit: number): Page<T> => {
  const items = rows.slice(0, limit);
  const last = items.at(-1);
  return { items, nextCursor: rows.length > limit && last ? encodeCursor(last) : null };
};
