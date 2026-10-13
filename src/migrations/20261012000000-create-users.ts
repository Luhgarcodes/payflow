import type { Migration } from '../db/migrate';
import { DataTypes, Sequelize } from 'sequelize';

export const up: Migration = async ({ context: qi }) => {
  await qi.createTable('users', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: Sequelize.literal('gen_random_uuid()'),
    },
    name: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, allowNull: false },
    phone_no: { type: DataTypes.STRING, allowNull: false },
    password_hash: { type: DataTypes.STRING, allowNull: false },
    role: {
      type: DataTypes.ENUM('user', 'merchant', 'support', 'admin'),
      allowNull: false,
      defaultValue: 'user',
    },
    kyc_tier: {
      type: DataTypes.ENUM('none', 'min', 'full'),
      allowNull: false,
      defaultValue: 'none',
    },
    phone_verified_at: { type: DataTypes.DATE, allowNull: true },
    last_login_at: { type: DataTypes.DATE, allowNull: true },
    is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.fn('now') },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.fn('now') },
  });

  await qi.addIndex('users', ['email'], {
    name: 'users_email_active_unique',
    unique: true,
    where: { is_active: true },
  });
  await qi.addIndex('users', ['phone_no'], {
    name: 'users_phone_no_active_unique',
    unique: true,
    where: { is_active: true },
  });
};

export const down: Migration = async ({ context: qi }) => {
  await qi.dropTable('users');
  await qi.sequelize.query('DROP TYPE IF EXISTS "enum_users_role";');
  await qi.sequelize.query('DROP TYPE IF EXISTS "enum_users_kyc_tier";');
};
