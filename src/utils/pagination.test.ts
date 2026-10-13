import AppError from './AppError';
import { decodeCursor, encodeCursor, toPage } from './pagination';

const position = { createdAt: new Date('2026-10-13T10:20:30.123Z'), id: 'abc-123' };

const expectInvalidCursor = (cursor: string): void => {
  expect(() => decodeCursor(cursor)).toThrow(AppError);
  try {
    decodeCursor(cursor);
  } catch (err) {
    expect((err as AppError).code).toBe('INVALID_CURSOR');
  }
};

describe('cursor encoding', () => {
  it('round-trips (createdAt, id)', () => {
    expect(decodeCursor(encodeCursor(position))).toEqual(position);
  });

  it('is opaque: the id and timestamp are not readable in the cursor', () => {
    const cursor = encodeCursor(position);
    expect(cursor).not.toContain('abc-123');
    expect(cursor).not.toContain('2026');
  });

  it('rejects a cursor whose payload was changed', () => {
    const [, signature] = encodeCursor(position).split('.');
    const forged = Buffer.from(JSON.stringify(['2030-01-01T00:00:00.000Z', 'abc-123'])).toString(
      'base64url',
    );
    expectInvalidCursor(`${forged}.${String(signature)}`);
  });

  it.each(['', 'garbage', 'a.b.c', 'only-payload.', '.only-signature'])(
    'rejects malformed cursor %p',
    (cursor) => {
      expectInvalidCursor(cursor);
    },
  );
});

describe('toPage', () => {
  const rows = [1, 2, 3].map((n) => ({
    createdAt: new Date(Date.UTC(2026, 0, n)),
    id: `id-${String(n)}`,
  }));

  it('returns a next cursor pointing at the last item when more rows exist', () => {
    const page = toPage(rows, 2);
    expect(page.items).toEqual(rows.slice(0, 2));
    expect(page.nextCursor).not.toBeNull();
    expect(decodeCursor(String(page.nextCursor))).toEqual(rows[1]);
  });

  it('returns a null cursor on the last page', () => {
    expect(toPage(rows, 3).nextCursor).toBeNull();
    expect(toPage([], 3)).toEqual({ items: [], nextCursor: null });
  });
});
