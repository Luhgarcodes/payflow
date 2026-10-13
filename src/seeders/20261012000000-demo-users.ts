import bcrypt from 'bcrypt';
import config from '../config';
import type { Migration } from '../db/migrate';

const users = [
  { name: 'Admin', email: 'admin@payflow.test', phone_no: '9000000001', role: 'admin' },
  { name: 'Support', email: 'support@payflow.test', phone_no: '9000000002', role: 'support' },
  { name: 'User One', email: 'user1@payflow.test', phone_no: '9000000003', role: 'user' },
  { name: 'User Two', email: 'user2@payflow.test', phone_no: '9000000004', role: 'user' },
  { name: 'User Three', email: 'user3@payflow.test', phone_no: '9000000005', role: 'user' },
  { name: 'Merchant', email: 'merchant@payflow.test', phone_no: '9000000006', role: 'merchant' },
];

export const up: Migration = async ({ context: qi }) => {
  const password_hash = await bcrypt.hash('Password123', config.bcryptRounds);
  await qi.bulkInsert(
    'users',
    users.map((u) => ({ ...u, password_hash })),
  );
};

export const down: Migration = async ({ context: qi }) => {
  await qi.bulkDelete('users', { email: users.map((u) => u.email) });
};
