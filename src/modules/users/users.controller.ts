import type { RequestHandler } from 'express';
import * as usersService from './users.service';
import { sendSuccess } from '../../utils/response';
import AppError from '../../utils/AppError';
import { isUserId, type UserId } from '../../types/domain';

type IdParams = { id: string };

const parseUserId = (value: string): UserId => {
  if (!isUserId(value)) throw new AppError('VALIDATION_FAILED', 'Invalid user id');
  return value;
};

export const list: RequestHandler = async (req, res) => {
  const users = await usersService.listUsers();
  sendSuccess(res, users, 'Users fetched');
};

export const getById: RequestHandler<IdParams> = async (req, res) => {
  const user = await usersService.getUserById(parseUserId(req.params.id));
  sendSuccess(res, user, 'User fetched');
};

export const create: RequestHandler = async (req, res) => {
  const user = await usersService.createUser(req.body);
  sendSuccess(res, user, 'User created', 201);
};

export const update: RequestHandler<IdParams> = async (req, res) => {
  const user = await usersService.updateUser(parseUserId(req.params.id), req.body);
  sendSuccess(res, user, 'User updated');
};

export const remove: RequestHandler<IdParams> = async (req, res) => {
  const result = await usersService.deleteUser(parseUserId(req.params.id));
  sendSuccess(res, result, 'User deleted');
};
