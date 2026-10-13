import { Umzug, SequelizeStorage } from 'umzug';
import { sequelize } from './index';

export const migrator = new Umzug({
  migrations: { glob: 'src/migrations/*.ts' },
  context: sequelize.getQueryInterface(),
  storage: new SequelizeStorage({ sequelize, tableName: 'SequelizeMeta' }),
  logger: console,
});

export const seeder = new Umzug({
  migrations: { glob: 'src/seeders/*.ts' },
  context: sequelize.getQueryInterface(),
  storage: new SequelizeStorage({ sequelize, tableName: 'SequelizeData' }),
  logger: console,
});

export type Migration = typeof migrator._types.migration;
