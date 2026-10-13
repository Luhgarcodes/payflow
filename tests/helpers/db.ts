import { QueryTypes } from 'sequelize';
import { sequelize } from '../../src/models';
import { connectRedis, disconnectRedis, isRedisReady, redisClient } from '../../src/db/redis';

const MIGRATION_TABLES = new Set(['SequelizeMeta', 'SequelizeData']);

/** Empties every application table and the test Redis database. */
export const resetState = async (): Promise<void> => {
  const tables = await sequelize.query<{ tablename: string }>(
    "SELECT tablename FROM pg_tables WHERE schemaname = 'public'",
    { type: QueryTypes.SELECT },
  );
  const names = tables.map((t) => t.tablename).filter((name) => !MIGRATION_TABLES.has(name));
  if (names.length > 0) {
    await sequelize.query(
      `TRUNCATE ${names.map((name) => `"${name}"`).join(', ')} RESTART IDENTITY CASCADE`,
    );
  }
  if (isRedisReady()) await redisClient.flushDb();
};

/** Registers hooks that give every test a clean database and close connections afterwards. */
export const useTestState = (): void => {
  beforeAll(async () => {
    await connectRedis();
  });

  beforeEach(async () => {
    await resetState();
  });

  afterAll(async () => {
    await Promise.allSettled([sequelize.close(), disconnectRedis()]);
  });
};
