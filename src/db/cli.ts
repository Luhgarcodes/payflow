import { QueryTypes, Sequelize } from 'sequelize';
import config from '../config';
import { logger } from '../utils/logger';
import { migrator, seeder } from './migrate';
import { sequelize } from './index';

const SAFE_DB_NAME = /^[A-Za-z0-9_]+$/;

async function createDatabase(): Promise<void> {
  const { name, user, password, host, port } = config.db;
  if (!SAFE_DB_NAME.test(name)) throw new Error(`Refusing to create database "${name}"`);

  const admin = new Sequelize('postgres', user, password, {
    host,
    port,
    dialect: 'postgres',
    logging: false,
  });
  try {
    const existing = await admin.query('SELECT 1 FROM pg_database WHERE datname = $name', {
      bind: { name },
      type: QueryTypes.SELECT,
    });
    if (existing.length === 0) {
      await admin.query(`CREATE DATABASE "${name}"`);
      logger.info({ database: name }, 'Database created');
    }
  } finally {
    await admin.close();
  }
}

const commands: Record<string, () => Promise<unknown>> = {
  create: createDatabase,
  migrate: () => migrator.up(),
  'migrate:undo': () => migrator.down(),
  'migrate:reset': () => migrator.down({ to: 0 }),
  seed: () => seeder.up(),
  'seed:undo': () => seeder.down({ to: 0 }),
};

async function main(): Promise<void> {
  const cmd = process.argv[2];
  const run = cmd ? commands[cmd] : undefined;
  if (!run) {
    logger.error({ command: cmd, available: Object.keys(commands) }, 'Unknown command');
    process.exit(1);
  }
  try {
    await run();
    logger.info({ command: cmd }, 'Command completed');
  } catch (err) {
    logger.error({ err, command: cmd }, 'Command failed');
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

void main();
