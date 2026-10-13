import request from 'supertest';
import app from '../../src/app';
import { ERROR_CATALOG, ERROR_CODES } from '../../src/utils/errorCodes';
import { useTestState } from '../helpers/db';

useTestState();

interface Spec {
  info: { description: string };
  components: { schemas: { ErrorCode: { enum: string[] } } };
  paths: Record<string, unknown>;
}

const fetchSpec = async (): Promise<Spec> => {
  const res = await request(app).get('/docs/openapi.json').expect(200);
  return res.body as Spec;
};

describe('API docs', () => {
  it('serves Swagger UI at /docs', async () => {
    const res = await request(app).get('/docs/').expect(200);
    expect(res.text).toContain('swagger-ui');
  });

  it('documents exactly the codes in the error catalog', async () => {
    const spec = await fetchSpec();
    expect([...spec.components.schemas.ErrorCode.enum].sort()).toEqual([...ERROR_CODES].sort());
  });

  it.each(ERROR_CODES)('lists %s with its HTTP status in the catalog table', async (code) => {
    const spec = await fetchSpec();
    expect(spec.info.description).toContain(
      `| \`${code}\` | ${String(ERROR_CATALOG[code].status)} |`,
    );
  });

  it('documents every users endpoint', async () => {
    const spec = await fetchSpec();
    expect(Object.keys(spec.paths).sort()).toEqual(['/users', '/users/{id}']);
  });
});
