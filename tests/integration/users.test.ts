import request from 'supertest';
import app from '../../src/app';
import { useTestState } from '../helpers/db';

useTestState();

interface UserInput {
  name: string;
  email: string;
  phone_no: string;
  password: string;
}

let sequence = 0;
const newUser = (overrides: Partial<UserInput> = {}): UserInput => {
  sequence += 1;
  return {
    name: `User ${String(sequence)}`,
    email: `user${String(sequence)}@payflow.test`,
    phone_no: String(9000000000 + sequence),
    password: 'Password123',
    ...overrides,
  };
};

const createUser = async (overrides: Partial<UserInput> = {}) => {
  const res = await request(app).post('/api/v1/users').send(newUser(overrides)).expect(201);
  return res.body.data as { id: string; email: string };
};

describe('POST /api/v1/users', () => {
  it('creates a user without exposing the password hash', async () => {
    const input = newUser({ email: '  Mixed.Case@PayFlow.test ' });

    const res = await request(app).post('/api/v1/users').send(input).expect(201);

    expect(res.body.status).toBe('success');
    expect(res.body.data).toMatchObject({
      name: input.name,
      email: 'mixed.case@payflow.test',
      role: 'user',
      kyc_tier: 'none',
      isActive: true,
    });
    expect(res.body.data).not.toHaveProperty('passwordHash');
    expect(res.body.data).not.toHaveProperty('password_hash');
  });

  it('returns field-level VALIDATION_FAILED details for invalid input', async () => {
    const res = await request(app)
      .post('/api/v1/users')
      .send({ name: '', email: 'not-an-email', phone_no: '123', password: 'short' })
      .expect(400);

    expect(res.body).toMatchObject({ status: 'error', code: 'VALIDATION_FAILED' });
    const fields = (res.body.details as { field: string }[]).map((d) => d.field);
    expect(fields).toEqual(
      expect.arrayContaining(['body.name', 'body.email', 'body.phone_no', 'body.password']),
    );
  });

  it('rejects unknown fields so clients cannot set the role', async () => {
    const res = await request(app)
      .post('/api/v1/users')
      .send({ ...newUser(), role: 'admin' })
      .expect(400);

    expect(res.body.code).toBe('VALIDATION_FAILED');
  });

  it('returns 409 EMAIL_TAKEN for a duplicate email', async () => {
    const existing = await createUser();

    const res = await request(app)
      .post('/api/v1/users')
      .send(newUser({ email: existing.email }))
      .expect(409);

    expect(res.body.code).toBe('EMAIL_TAKEN');
  });

  it('returns 409 PHONE_TAKEN for a duplicate phone number', async () => {
    await createUser({ phone_no: '9876543210' });

    const res = await request(app)
      .post('/api/v1/users')
      .send(newUser({ phone_no: '9876543210' }))
      .expect(409);

    expect(res.body.code).toBe('PHONE_TAKEN');
  });

  it('returns 400 INVALID_JSON for a malformed body', async () => {
    const res = await request(app)
      .post('/api/v1/users')
      .set('Content-Type', 'application/json')
      .send('{"name":')
      .expect(400);

    expect(res.body.code).toBe('INVALID_JSON');
  });
});

describe('GET /api/v1/users/:id', () => {
  it('returns the user', async () => {
    const user = await createUser();

    const res = await request(app).get(`/api/v1/users/${user.id}`).expect(200);

    expect(res.body.data.id).toBe(user.id);
  });

  it('returns 400 VALIDATION_FAILED for a malformed id', async () => {
    const res = await request(app).get('/api/v1/users/not-a-uuid').expect(400);

    expect(res.body.code).toBe('VALIDATION_FAILED');
    expect(res.body.details).toEqual([expect.objectContaining({ field: 'params.id' })]);
  });

  it('returns 404 USER_NOT_FOUND for an unknown id', async () => {
    const res = await request(app)
      .get('/api/v1/users/7d4f2c1e-9a3b-4c5d-8e6f-0a1b2c3d4e5f')
      .expect(404);

    expect(res.body).toEqual({
      status: 'error',
      code: 'USER_NOT_FOUND',
      message: 'User not found',
      details: null,
    });
  });
});

describe('GET /api/v1/users', () => {
  it('pages through users newest first without gaps or repeats', async () => {
    const created: string[] = [];
    for (let i = 0; i < 5; i += 1) created.push((await createUser()).id);

    const seen: string[] = [];
    let cursor: string | null = null;
    let pages = 0;
    do {
      const res = await request(app)
        .get('/api/v1/users')
        .query(cursor ? { limit: 2, cursor } : { limit: 2 })
        .expect(200);
      const page = res.body.data as { items: { id: string }[]; nextCursor: string | null };
      seen.push(...page.items.map((u) => u.id));
      cursor = page.nextCursor;
      pages += 1;
    } while (cursor);

    expect(pages).toBe(3);
    expect(seen).toEqual([...created].reverse());
  });

  it('rejects a tampered cursor with 400 INVALID_CURSOR', async () => {
    await createUser();
    await createUser();
    const first = await request(app).get('/api/v1/users').query({ limit: 1 }).expect(200);
    const signature = (first.body.data.nextCursor as string).split('.')[1] ?? '';
    const forgedPayload = Buffer.from(
      JSON.stringify(['2099-01-01T00:00:00.000Z', '00000000-0000-4000-8000-000000000000']),
    ).toString('base64url');
    const forged = `${forgedPayload}.${signature}`;

    const res = await request(app).get('/api/v1/users').query({ cursor: forged }).expect(400);

    expect(res.body.code).toBe('INVALID_CURSOR');
  });

  it('rejects an out-of-range limit', async () => {
    const res = await request(app).get('/api/v1/users').query({ limit: 500 }).expect(400);

    expect(res.body.code).toBe('VALIDATION_FAILED');
    expect(res.body.details).toEqual([expect.objectContaining({ field: 'query.limit' })]);
  });
});

describe('PUT /api/v1/users/:id', () => {
  it('updates the user', async () => {
    const user = await createUser();

    const res = await request(app)
      .put(`/api/v1/users/${user.id}`)
      .send({ name: 'Renamed', email: user.email, phone_no: '9123456780', kyc_tier: 'min' })
      .expect(200);

    expect(res.body.data).toMatchObject({
      name: 'Renamed',
      phone_no: '9123456780',
      kyc_tier: 'min',
    });
  });

  it("returns 409 EMAIL_TAKEN when taking another active user's email", async () => {
    const a = await createUser();
    const b = await createUser();

    const res = await request(app)
      .put(`/api/v1/users/${b.id}`)
      .send({ name: 'B', email: a.email, phone_no: '9123456781' })
      .expect(409);

    expect(res.body.code).toBe('EMAIL_TAKEN');
  });
});

describe('DELETE /api/v1/users/:id', () => {
  it('deactivates the user and frees the email for reuse', async () => {
    const user = await createUser({ phone_no: '9000011111' });

    await request(app).delete(`/api/v1/users/${user.id}`).expect(200);
    await request(app).get(`/api/v1/users/${user.id}`).expect(404);

    await request(app)
      .post('/api/v1/users')
      .send(newUser({ email: user.email, phone_no: '9000011111' }))
      .expect(201);
  });
});

describe('cross-cutting behaviour', () => {
  it('returns an X-Request-Id header and echoes a valid incoming one', async () => {
    const generated = await request(app).get('/api/v1/users').expect(200);
    expect(generated.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);

    const echoed = await request(app)
      .get('/api/v1/users')
      .set('X-Request-Id', 'client-trace-42')
      .expect(200);
    expect(echoed.headers['x-request-id']).toBe('client-trace-42');
  });

  it('returns 404 ROUTE_NOT_FOUND for unknown routes', async () => {
    const res = await request(app).get('/api/v1/nope').expect(404);

    expect(res.body.code).toBe('ROUTE_NOT_FOUND');
  });
});
