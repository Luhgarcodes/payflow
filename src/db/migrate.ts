import { Umzug, SequelizeStorage } from 'umzug';
import { sequelize } from './index';
import { logger } from '../utils/logger';

export const migrator = new Umzug({
  migrations: { glob: 'src/migrations/*.ts' },
  context: sequelize.getQueryInterface(),
  storage: new SequelizeStorage({ sequelize, tableName: 'SequelizeMeta' }),
  logger: logger.child({ component: 'migrations' }),
});

export const seeder = new Umzug({
  migrations: { glob: 'src/seeders/*.ts' },
  context: sequelize.getQueryInterface(),
  storage: new SequelizeStorage({ sequelize, tableName: 'SequelizeData' }),
  logger: logger.child({ component: 'seeders' }),
});

export type Migration = typeof migrator._types.migration;
