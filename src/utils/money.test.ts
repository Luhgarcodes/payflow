import AppError from './AppError';
import {
  add,
  allocate,
  fee,
  formatINR,
  fromDb,
  paise,
  parseRupees,
  split,
  subtract,
  toRupeeString,
  type Rounding,
} from './money';

const expectInvalidAmount = (fn: () => unknown): void => {
  expect(fn).toThrow(AppError);
  try {
    fn();
  } catch (err) {
    expect((err as AppError).code).toBe('INVALID_AMOUNT');
  }
};

describe('paise', () => {
  it.each([0, 1, -1, 100, Number.MAX_SAFE_INTEGER])('accepts the integer %p', (value) => {
    expect(paise(value)).toBe(value);
  });

  it.each([0.5, 1.01, Number.NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])('rejects %p', (value) => {
    expectInvalidAmount(() => paise(value));
  });
});

describe('fromDb', () => {
  it.each([
    ['0', 0],
    ['12345', 12345],
    ['-500', -500],
    ['9007199254740991', Number.MAX_SAFE_INTEGER],
    [42, 42],
    [10n, 10],
  ] as const)('converts %p to %p', (input, expected) => {
    expect(fromDb(input)).toBe(expected);
  });

  it.each(['12.5', 'abc', '', '9007199254740992', ' 1'])('rejects %p', (input) => {
    expectInvalidAmount(() => fromDb(input));
  });
});

describe('parseRupees', () => {
  it.each([
    ['0', 0],
    ['1', 100],
    ['1.5', 150],
    ['1.05', 105],
    ['1234.56', 123456],
    ['-0.75', -75],
    [' 10.00 ', 1000],
  ])('parses %p as %p paise', (input, expected) => {
    expect(parseRupees(input)).toBe(expected);
  });

  it.each(['1.234', '1,000', 'abc', '', '.5', '1.', '+1'])('rejects %p', (input) => {
    expectInvalidAmount(() => parseRupees(input));
  });
});

describe('formatting', () => {
  it.each([
    [0, '₹0.00'],
    [5, '₹0.05'],
    [100, '₹1.00'],
    [99999, '₹999.99'],
    [100000, '₹1,000.00'],
    [10000000, '₹1,00,000.00'],
    [123456789, '₹12,34,567.89'],
    [100000000000, '₹1,00,00,00,000.00'],
    [1000000000000, '₹10,00,00,00,000.00'],
    [-150050, '-₹1,500.50'],
  ])('formats %p paise as %p', (value, expected) => {
    expect(formatINR(paise(value))).toBe(expected);
  });

  it.each([
    [0, '0.00'],
    [7, '0.07'],
    [123456, '1234.56'],
    [-5, '-0.05'],
  ])('toRupeeString(%p) is %p', (value, expected) => {
    expect(toRupeeString(paise(value))).toBe(expected);
  });
});

describe('add and subtract', () => {
  it('adds and subtracts exactly', () => {
    expect(add(paise(10), paise(20), paise(30))).toBe(60);
    expect(add()).toBe(0);
    expect(subtract(paise(100), paise(250))).toBe(-150);
  });

  it('rejects results outside the safe integer range', () => {
    expectInvalidAmount(() => add(paise(Number.MAX_SAFE_INTEGER), paise(1)));
  });
});

describe('fee', () => {
  it.each<[number, number, Rounding, number]>([
    [10000, 175, 'half-up', 175],
    [10000, 0, 'half-up', 0],
    [10000, 10000, 'half-up', 10000],
    [999, 150, 'half-up', 15],
    [100, 50, 'half-up', 1],
    [100, 50, 'half-even', 0],
    [300, 50, 'half-even', 2],
    [100, 49, 'half-up', 0],
    [101, 99, 'floor', 0],
    [101, 99, 'ceil', 1],
    [-100, 50, 'half-up', -1],
    [-150, 50, 'half-even', -1],
    [-101, 99, 'floor', -1],
    [-101, 99, 'ceil', 0],
    [Number.MAX_SAFE_INTEGER, 1, 'half-up', 900719925474],
  ])('fee(%p, %p bps, %s) = %p', (amount, bps, rounding, expected) => {
    expect(fee(paise(amount), bps, rounding)).toBe(expected);
  });

  it.each([-1, 10001, 1.5])('rejects %p basis points', (bps) => {
    expectInvalidAmount(() => fee(paise(100), bps));
  });
});

describe('split and allocate', () => {
  it.each([
    [100, 3, [34, 33, 33]],
    [100, 4, [25, 25, 25, 25]],
    [1, 3, [1, 0, 0]],
    [0, 2, [0, 0]],
    [-100, 3, [-34, -33, -33]],
    [10001, 7, [1429, 1429, 1429, 1429, 1429, 1428, 1428]],
  ])('split(%p, %p) = %p', (total, parts, expected) => {
    expect(split(paise(total), parts)).toEqual(expected);
  });

  it.each([
    [1000, [1, 1, 1], [334, 333, 333]],
    [100, [70, 20, 10], [70, 20, 10]],
    [101, [70, 20, 10], [71, 20, 10]],
    [99, [1, 2], [33, 66]],
    [100, [0, 1], [0, 100]],
    [7, [3, 3, 1], [3, 3, 1]],
  ])('allocate(%p, %p) = %p', (total, weights, expected) => {
    expect(allocate(paise(total), weights)).toEqual(expected);
  });

  it.each([
    [1, 2],
    [100, 3],
    [999_999, 7],
    [-12345, 11],
    [Number.MAX_SAFE_INTEGER, 13],
  ])('split(%p, %p) always sums to the total', (total, parts) => {
    const shares = split(paise(total), parts);
    expect(shares).toHaveLength(parts);
    expect(add(...shares)).toBe(total);
  });

  it('rejects invalid parts and weights', () => {
    expectInvalidAmount(() => split(paise(100), 0));
    expectInvalidAmount(() => split(paise(100), 1.5));
    expectInvalidAmount(() => allocate(paise(100), []));
    expectInvalidAmount(() => allocate(paise(100), [0, 0]));
    expectInvalidAmount(() => allocate(paise(100), [-1, 2]));
  });
});
