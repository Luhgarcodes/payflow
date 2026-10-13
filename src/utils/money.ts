import AppError from './AppError';

/**
 * The only module allowed to do money arithmetic. Amounts are integer paise (1 rupee = 100 paise)
 * branded as `Paise`, so plain numbers or rupee values cannot be passed where paise are expected.
 * Intermediate products use BigInt, so fee and split calculations never lose precision.
 */

declare const paiseBrand: unique symbol;
export type Paise = number & { readonly [paiseBrand]: true };

/** 1 basis point = 0.01%, so 10_000 bps = 100%. */
export type BasisPoints = number;

export type Rounding = 'half-up' | 'half-even' | 'floor' | 'ceil';

const BPS_DENOMINATOR = 10_000n;
const MAX_BPS = 10_000;
const MIN_SAFE = BigInt(Number.MIN_SAFE_INTEGER);
const MAX_SAFE = BigInt(Number.MAX_SAFE_INTEGER);

const invalidAmount = (message: string): AppError => new AppError('INVALID_AMOUNT', message);

const fromBigInt = (value: bigint): Paise => {
  if (value < MIN_SAFE || value > MAX_SAFE) throw invalidAmount('Amount is out of range');
  return Number(value) as Paise;
};

/** Brands an integer number of paise. Rejects floats, NaN, Infinity and unsafe integers. */
export const paise = (value: number): Paise => {
  if (!Number.isSafeInteger(value)) {
    throw invalidAmount('Amount must be a whole number of paise');
  }
  return value as Paise;
};

export const ZERO = paise(0);

/** Converts a PostgreSQL BIGINT (returned by pg as a string) to Paise without precision loss. */
export const fromDb = (value: string | number | bigint): Paise => {
  if (typeof value === 'number') return paise(value);
  if (typeof value === 'bigint') return fromBigInt(value);
  if (!/^-?\d+$/.test(value)) throw invalidAmount('Stored amount is not an integer');
  return fromBigInt(BigInt(value));
};

/** Parses a rupee string such as "1234", "1234.5" or "-0.75" into paise. */
export const parseRupees = (input: string): Paise => {
  const match = /^(-)?(\d+)(?:\.(\d{1,2}))?$/.exec(input.trim());
  if (!match) throw invalidAmount('Amount must be a rupee value with at most 2 decimal places');
  const [, minus, rupees = '0', fraction = ''] = match;
  const magnitude = BigInt(rupees) * 100n + BigInt(fraction.padEnd(2, '0'));
  return fromBigInt(minus ? -magnitude : magnitude);
};

/** Plain rupee string with two decimals, e.g. 123456 -> "1234.56". */
export const toRupeeString = (amount: Paise): string => {
  const value = BigInt(amount);
  const magnitude = value < 0n ? -value : value;
  const fraction = (magnitude % 100n).toString().padStart(2, '0');
  return `${value < 0n ? '-' : ''}${(magnitude / 100n).toString()}.${fraction}`;
};

/** Indian numbering style, e.g. 10000000 -> "₹1,00,000.00". */
export const formatINR = (amount: Paise): string => {
  const plain = toRupeeString(amount);
  const negative = plain.startsWith('-');
  const [rupees = '0', fraction = '00'] = (negative ? plain.slice(1) : plain).split('.');
  const lastThree = rupees.slice(-3);
  const rest = rupees.slice(0, -3);
  const grouped = rest ? `${rest.replace(/\B(?=(\d{2})+$)/g, ',')},${lastThree}` : lastThree;
  return `${negative ? '-' : ''}₹${grouped}.${fraction}`;
};

export const add = (...amounts: Paise[]): Paise =>
  fromBigInt(amounts.reduce((sum, amount) => sum + BigInt(amount), 0n));

export const subtract = (from: Paise, amount: Paise): Paise =>
  fromBigInt(BigInt(from) - BigInt(amount));

/** Integer division with explicit rounding. The divisor must be positive. */
const divide = (numerator: bigint, divisor: bigint, rounding: Rounding): bigint => {
  const quotient = numerator / divisor;
  const remainder = numerator % divisor;
  if (remainder === 0n) return quotient;

  const negative = numerator < 0n;
  const twiceRemainder = 2n * (remainder < 0n ? -remainder : remainder);
  const awayFromZero = negative ? quotient - 1n : quotient + 1n;

  switch (rounding) {
    case 'floor':
      return negative ? quotient - 1n : quotient;
    case 'ceil':
      return negative ? quotient : quotient + 1n;
    case 'half-up':
      return twiceRemainder >= divisor ? awayFromZero : quotient;
    case 'half-even':
      if (twiceRemainder > divisor) return awayFromZero;
      if (twiceRemainder < divisor) return quotient;
      return quotient % 2n === 0n ? quotient : awayFromZero;
  }
};

/** A percentage fee expressed in basis points, e.g. 1.75% of ₹100 = fee(paise(10000), 175). */
export const fee = (amount: Paise, bps: BasisPoints, rounding: Rounding = 'half-up'): Paise => {
  if (!Number.isInteger(bps) || bps < 0 || bps > MAX_BPS) {
    throw invalidAmount(`Fee must be a whole number of basis points between 0 and ${MAX_BPS}`);
  }
  return fromBigInt(divide(BigInt(amount) * BigInt(bps), BPS_DENOMINATOR, rounding));
};

/**
 * Splits an amount by integer weights using the largest-remainder method. The parts always sum
 * exactly to the total; leftover paise go to the parts with the largest remainders, then to the
 * earliest parts on ties.
 */
export const allocate = (total: Paise, weights: readonly number[]): Paise[] => {
  if (weights.length === 0 || weights.some((w) => !Number.isSafeInteger(w) || w < 0)) {
    throw invalidAmount('Weights must be non-negative whole numbers');
  }
  const weightSum = weights.reduce((sum, w) => sum + BigInt(w), 0n);
  if (weightSum === 0n) throw invalidAmount('At least one weight must be positive');

  const sign = total < 0 ? -1n : 1n;
  const magnitude = BigInt(total) * sign;

  const shares = weights.map((w, index) => {
    const product = magnitude * BigInt(w);
    return { index, base: product / weightSum, remainder: product % weightSum };
  });

  let leftover = magnitude - shares.reduce((sum, share) => sum + share.base, 0n);
  const byRemainder = [...shares].sort((a, b) =>
    a.remainder === b.remainder ? a.index - b.index : a.remainder > b.remainder ? -1 : 1,
  );
  for (const share of byRemainder) {
    if (leftover === 0n) break;
    share.base += 1n;
    leftover -= 1n;
  }

  return shares.map((share) => fromBigInt(share.base * sign));
};

/** Splits an amount into `parts` near-equal shares that always sum to the total. */
export const split = (total: Paise, parts: number): Paise[] => {
  if (!Number.isSafeInteger(parts) || parts < 1) {
    throw invalidAmount('Parts must be a positive whole number');
  }
  return allocate(
    total,
    Array.from({ length: parts }, () => 1),
  );
};
