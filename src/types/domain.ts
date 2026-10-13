export const ROLES = ['user', 'merchant', 'support', 'admin'] as const;
export type Role = (typeof ROLES)[number];

export const KYC_TIERS = ['none', 'min', 'full'] as const;
export type KycTier = (typeof KYC_TIERS)[number];

export const TRANSACTION_STATUSES = ['pending', 'completed', 'failed', 'reversed'] as const;
export type TransactionStatus = (typeof TRANSACTION_STATUSES)[number];

declare const brand: unique symbol;
type Brand<T, B extends string> = T & { readonly [brand]: B };
export type UserId = Brand<string, 'UserId'>;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isUserId = (value: string): value is UserId => UUID_RE.test(value);
