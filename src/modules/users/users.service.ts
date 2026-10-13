import bcrypt from 'bcrypt';
import { Op, type InferAttributes } from 'sequelize';
import config from '../../config';
import { User } from '../../models';
import { invalidateNamespace } from '../../cache';
import AppError from '../../utils/AppError';
import requireFields from '../../utils/requireFields';
import type { KycTier, Role, UserId } from '../../types/domain';

export const CACHE_NAMESPACE = 'users';

export type PublicUser = Omit<InferAttributes<User>, 'passwordHash'>;

// Request bodies are only presence-checked until Zod schemas replace these types (FND-06).
interface CreateUserInput {
  name: string;
  email: string;
  phone_no: string;
  password: string;
  role?: Role;
  kyc_tier?: KycTier;
  phone_verified_at?: Date | null;
  last_login_at?: Date | null;
}

interface UpdateUserInput {
  role?: Role;
  kyc_tier?: KycTier;
  phone_verified_at?: Date | null;
  last_login_at?: Date | null;
  name: string;
  email: string;
  phone_no: string;
  password?: string;
  is_active?: boolean;
}

const PUBLIC_ATTRIBUTES = [
  'id',
  'name',
  'email',
  'phone_no',
  'isActive',
  'role',
  'kyc_tier',
  'phone_verified_at',
  'last_login_at',
  'createdAt',
  'updatedAt',
] as const;

const toPublic = (user: User): PublicUser => {
  const { passwordHash: _passwordHash, ...rest } = user.get({ plain: true });
  return rest;
};

const hashPassword = (password: string): Promise<string> =>
  bcrypt.hash(password, config.bcryptRounds);

const ensureEmailAvailable = async (email: string, excludeId?: UserId): Promise<void> => {
  const where = excludeId
    ? { email, id: { [Op.ne]: excludeId }, isActive: true }
    : { email, isActive: true };
  if (await User.findOne({ where })) throw new AppError('EMAIL_TAKEN');
};

export const listUsers = (): Promise<User[]> =>
  User.findAll({
    where: { isActive: true },
    attributes: [...PUBLIC_ATTRIBUTES],
    order: [['createdAt', 'DESC']],
  });

export const getUserById = async (id: UserId): Promise<User> => {
  const user = await User.findOne({
    where: { id, isActive: true },
    attributes: [...PUBLIC_ATTRIBUTES],
  });
  if (!user) throw new AppError('USER_NOT_FOUND');
  return user;
};

export const createUser = async (body: unknown): Promise<PublicUser> => {
  requireFields(body, ['name', 'email', 'phone_no', 'password']);
  const { name, email, phone_no, password } = body as unknown as CreateUserInput;

  await ensureEmailAvailable(email);
  const user = await User.create({
    name,
    email,
    phone_no,
    passwordHash: await hashPassword(password),
    role: 'user',
    kyc_tier: 'none',
    phone_verified_at: null,
    last_login_at: null,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  await invalidateNamespace(CACHE_NAMESPACE);
  return toPublic(user);
};

export const updateUser = async (id: UserId, body: unknown): Promise<PublicUser> => {
  requireFields(body, ['name', 'email', 'phone_no']);
  const {
    name,
    email,
    phone_no,
    password,
    is_active,
    role,
    kyc_tier,
    phone_verified_at,
    last_login_at,
  } = body as unknown as UpdateUserInput;

  const user = await User.findByPk(id);
  if (!user) throw new AppError('USER_NOT_FOUND');

  await ensureEmailAvailable(email, id);

  const changes: Partial<InferAttributes<User>> = {
    name,
    email,
    phone_no,
    role,
    kyc_tier,
    phone_verified_at,
    last_login_at,
  };
  if (password) changes.passwordHash = await hashPassword(password);
  if (is_active !== undefined) changes.isActive = is_active;

  await user.update(changes);

  await invalidateNamespace(CACHE_NAMESPACE);
  return toPublic(user);
};

export const deleteUser = async (id: UserId): Promise<{ id: UserId }> => {
  const user = await User.findOne({ where: { id, isActive: true } });
  if (!user) throw new AppError('USER_NOT_FOUND');

  await user.update({ isActive: false });

  await invalidateNamespace(CACHE_NAMESPACE);
  return { id };
};
