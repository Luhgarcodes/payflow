import { Sequelize } from 'sequelize';
import config from '../config';

const { name, user, password, host, port, logging } = config.db;

export const sequelize = new Sequelize(name, user, password, {
  host,
  port,
  dialect: 'postgres',
  benchmark: true,
  logging: logging
    ? (sql: string, timing?: number) => {
        console.log(`[Sequelize] ${sql} - ${String(timing)}ms`);
      }
    : false,
});
