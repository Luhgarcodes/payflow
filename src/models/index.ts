import { sequelize } from '../db';
import { User, initUserModel } from './user.model';

initUserModel(sequelize);

export const models = { User };

export { sequelize, User };
