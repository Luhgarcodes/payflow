import { z } from 'zod';
import { KYC_TIERS, ROLES, userIdSchema } from '../../types/domain';
import { paginationQuerySchema } from '../../utils/pagination';

const name = z.string().trim().min(1).max(100);
const email = z.email().trim().toLowerCase().max(255);
const phoneNo = z.string().regex(/^[0-9]{10}$/, 'must be exactly 10 digits');
const password = z
  .string()
  .min(8, 'must be at least 8 characters')
  .max(72, 'must be at most 72 characters')
  .regex(/[A-Za-z]/, 'must contain a letter')
  .regex(/[0-9]/, 'must contain a number');
const timestamp = z.iso
  .datetime({ offset: true })
  .transform((value) => new Date(value))
  .nullable();

export const userIdParamsSchema = z.object({ id: userIdSchema });

export const listUsersQuerySchema = paginationQuerySchema;

export const createUserBodySchema = z.strictObject({
  name,
  email,
  phone_no: phoneNo,
  password,
});

export const updateUserBodySchema = z.strictObject({
  name,
  email,
  phone_no: phoneNo,
  password: password.optional(),
  is_active: z.boolean().optional(),
  role: z.enum(ROLES).optional(),
  kyc_tier: z.enum(KYC_TIERS).optional(),
  phone_verified_at: timestamp.optional(),
  last_login_at: timestamp.optional(),
});

export type UserIdParams = z.infer<typeof userIdParamsSchema>;
export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;
export type CreateUserBody = z.infer<typeof createUserBodySchema>;
export type UpdateUserBody = z.infer<typeof updateUserBodySchema>;
