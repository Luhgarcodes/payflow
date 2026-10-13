import bcrypt from 'bcrypt';
import { Op, type InferAttributes } from 'sequelize';
import config from '../../config';
import { User } from '../../models';
import { invalidateNamespace } from '../../cache';
import AppError from '../../utils/AppError';
import { afterCursor, CURSOR_ORDER, toPage, type Page } from '../../utils/pagination';
import type { UserId } from '../../types/domain';
import type { CreateUserBody, ListUsersQuery, UpdateUserBody } from './users.schema';

export const CACHE_NAMESPACE = 'users';

export type PublicUser = Omit<InferAttributes<User>, 'passwordHash'>;

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

export const listUsers = async ({ limit, cursor }: ListUsersQuery): Promise<Page<User>> => {
  const rows = await User.findAll({
    where: { [Op.and]: [{ isActive: true }, afterCursor(cursor)] },
    attributes: [...PUBLIC_ATTRIBUTES],
    order: CURSOR_ORDER,
    limit: limit + 1,
  });
  return toPage(rows, limit);
};

export const getUserById = async (id: UserId): Promise<User> => {
  const user = await User.findOne({
    where: { id, isActive: true },
    attributes: [...PUBLIC_ATTRIBUTES],
  });
  if (!user) throw new AppError('USER_NOT_FOUND');
  return user;
};

export const createUser = async ({
  name,
  email,
  phone_no,
  password,
}: CreateUserBody): Promise<PublicUser> => {
  await ensureEmailAvailable(email);
  const user = await User.create({
    name,
    email,
    phone_no,
    passwordHash: await hashPassword(password),
  });

  await invalidateNamespace(CACHE_NAMESPACE);
  return toPublic(user);
};

export const updateUser = async (id: UserId, body: UpdateUserBody): Promise<PublicUser> => {
  const user = await User.findByPk(id);
  if (!user) throw new AppError('USER_NOT_FOUND');

  await ensureEmailAvailable(body.email, id);

  const { password, is_active, ...fields } = body;
  const changes: Partial<InferAttributes<User>> = { ...fields };
  if (password !== undefined) changes.passwordHash = await hashPassword(password);
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
