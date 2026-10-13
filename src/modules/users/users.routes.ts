import { Router } from 'express';
import * as controller from './users.controller';
import { CACHE_NAMESPACE } from './users.service';
import {
  createUserBodySchema,
  listUsersQuerySchema,
  updateUserBodySchema,
  userIdParamsSchema,
} from './users.schema';
import { cache } from '../../middleware/cache';
import { validate } from '../../middleware/validate';

const router = Router();

// User data differs per caller once auth exists, so it is only cached per authenticated user.
const userCache = cache(CACHE_NAMESPACE, { scope: 'user' });

router.get('/', validate({ query: listUsersQuerySchema }), userCache, controller.list);
router.get('/:id', validate({ params: userIdParamsSchema }), userCache, controller.getById);
router.post('/', validate({ body: createUserBodySchema }), controller.create);
router.put(
  '/:id',
  validate({ params: userIdParamsSchema, body: updateUserBodySchema }),
  controller.update,
);
router.delete('/:id', validate({ params: userIdParamsSchema }), controller.remove);

export default router;
