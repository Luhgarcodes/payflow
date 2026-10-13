import { readFileSync } from 'node:fs';
import path from 'node:path';
import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import { parse } from 'yaml';
import { z } from 'zod';

// Resolves from both src/routes (tsx) and dist/routes (compiled build).
const SPEC_PATH = path.resolve(__dirname, '..', '..', 'docs', 'openapi.yaml');

export const openApiSpec = z
  .record(z.string(), z.unknown())
  .parse(parse(readFileSync(SPEC_PATH, 'utf8')));

const router = Router();

router.get('/openapi.json', (_req, res) => {
  res.json(openApiSpec);
});
router.use('/', swaggerUi.serve, swaggerUi.setup(openApiSpec));

export default router;
