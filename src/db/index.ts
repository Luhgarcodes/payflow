import { Sequelize } from 'sequelize';
import config from '../config';
import { logger } from '../utils/logger';

const { name, user, password, host, port, logging } = config.db;

const sqlLogger = logger.child({ component: 'sequelize' });

export const sequelize = new Sequelize(name, user, password, {
  host,
  port,
  dialect: 'postgres',
  benchmark: true,
  logging: logging
    ? (sql: string, timing?: number) => {
        sqlLogger.info({ durationMs: timing }, sql);
      }
    : false,
});
