import { z } from 'zod';

export const ROLES = ['user', 'merchant', 'support', 'admin'] as const;
export type Role = (typeof ROLES)[number];

export const KYC_TIERS = ['none', 'min', 'full'] as const;
export type KycTier = (typeof KYC_TIERS)[number];

export const TRANSACTION_STATUSES = ['pending', 'completed', 'failed', 'reversed'] as const;
export type TransactionStatus = (typeof TRANSACTION_STATUSES)[number];

export const userIdSchema = z.uuid().brand<'UserId'>();
export type UserId = z.infer<typeof userIdSchema>;
