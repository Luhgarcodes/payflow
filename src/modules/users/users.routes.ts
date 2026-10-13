import { Router } from 'express';
import * as controller from './users.controller';
import { CACHE_NAMESPACE } from './users.service';
import { cache } from '../../middleware/cache';

const router = Router();

// User data differs per caller once auth exists, so it is only cached per authenticated user.
const userCache = cache(CACHE_NAMESPACE, { scope: 'user' });

router.get('/', userCache, controller.list);
router.get('/:id', userCache, controller.getById);
router.post('/', controller.create);
router.put('/:id', controller.update);
router.delete('/:id', controller.remove);

export default router;
