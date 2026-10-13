import * as usersService from './users.service';
import type * as schemas from './users.schema';
import { sendSuccess } from '../../utils/response';
import type { ValidatedHandler } from '../../middleware/validate';

export const list: ValidatedHandler<{ query: typeof schemas.listUsersQuerySchema }> = async (
  req,
  res,
) => {
  const page = await usersService.listUsers(req.query);
  sendSuccess(res, page, 'Users fetched');
};

export const getById: ValidatedHandler<{ params: typeof schemas.userIdParamsSchema }> = async (
  req,
  res,
) => {
  const user = await usersService.getUserById(req.params.id);
  sendSuccess(res, user, 'User fetched');
};

export const create: ValidatedHandler<{ body: typeof schemas.createUserBodySchema }> = async (
  req,
  res,
) => {
  const user = await usersService.createUser(req.body);
  sendSuccess(res, user, 'User created', 201);
};

export const update: ValidatedHandler<{
  params: typeof schemas.userIdParamsSchema;
  body: typeof schemas.updateUserBodySchema;
}> = async (req, res) => {
  const user = await usersService.updateUser(req.params.id, req.body);
  sendSuccess(res, user, 'User updated');
};

export const remove: ValidatedHandler<{ params: typeof schemas.userIdParamsSchema }> = async (
  req,
  res,
) => {
  const result = await usersService.deleteUser(req.params.id);
  sendSuccess(res, result, 'User deleted');
};
