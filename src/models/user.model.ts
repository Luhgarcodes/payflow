import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
  type Sequelize,
} from 'sequelize';
import { KYC_TIERS, ROLES, type KycTier, type Role, type UserId } from '../types/domain';

export class User extends Model<InferAttributes<User>, InferCreationAttributes<User>> {
  declare id: CreationOptional<UserId>;
  declare name: string;
  declare phone_no: string;
  declare email: string;
  declare passwordHash: string;
  declare role: CreationOptional<Role>;
  declare kyc_tier: CreationOptional<KycTier>;
  declare phone_verified_at: CreationOptional<Date | null>;
  declare last_login_at: CreationOptional<Date | null>;
  declare isActive: CreationOptional<boolean>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export function initUserModel(sequelize: Sequelize): typeof User {
  User.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      phone_no: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: { is: /^[0-9]{10}$/ },
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: { isEmail: true },
      },
      passwordHash: {
        type: DataTypes.STRING,
        allowNull: false,
        field: 'password_hash',
      },
      role: {
        type: DataTypes.ENUM(...ROLES),
        defaultValue: 'user',
        allowNull: false,
      },
      kyc_tier: {
        type: DataTypes.ENUM(...KYC_TIERS),
        defaultValue: 'none',
        allowNull: false,
      },
      phone_verified_at: DataTypes.DATE,
      last_login_at: DataTypes.DATE,
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        field: 'is_active',
      },
      createdAt: DataTypes.DATE(3),
      updatedAt: DataTypes.DATE(3),
    },
    {
      sequelize,
      modelName: 'User',
      tableName: 'users',
      underscored: true,
      timestamps: true,
    },
  );

  return User;
}
