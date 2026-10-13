import type { Migration } from '../db/migrate';

export const up: Migration = async ({ context: qi }) => {
  await qi.sequelize.query(`
    ALTER TABLE users
      ALTER COLUMN created_at TYPE TIMESTAMP(3) WITH TIME ZONE,
      ALTER COLUMN updated_at TYPE TIMESTAMP(3) WITH TIME ZONE;
  `);
};

export const down: Migration = async ({ context: qi }) => {
  await qi.sequelize.query(`
    ALTER TABLE users
      ALTER COLUMN created_at TYPE TIMESTAMP WITH TIME ZONE,
      ALTER COLUMN updated_at TYPE TIMESTAMP WITH TIME ZONE;
  `);
};
