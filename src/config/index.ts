import dotenv from 'dotenv';
import { z } from 'zod';

// Earlier files win, so .env.test only needs the values that differ from .env.
dotenv.config({
  path: process.env.NODE_ENV === 'test' ? ['.env.test', '.env'] : ['.env'],
  quiet: true,
});

const bool = z
  .enum(['true', 'false'])
  .default('false')
  .transform((val) => val === 'true');

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),
  TRUST_PROXY: z.coerce.number().int().min(0).default(0),
  SHUTDOWN_TIMEOUT_MS: z.coerce.number().int().positive().default(10000),
  BCRYPT_ROUNDS: z.coerce.number().int().min(10).max(15).default(10),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),

  DB_NAME: z.string().min(1),
  DB_USER: z.string().min(1),
  DB_PASS: z.string(),
  DB_HOST: z.string().min(1).default('localhost'),
  DB_PORT: z.coerce.number().int().positive().default(5432),
  DB_LOGGING: bool,

  REDIS_URL: z.url().default('redis://localhost:6379'),
  REDIS_DEFAULT_TTL: z.coerce.number().int().positive().default(60),

  JWT_ACCESS_SECRET: z.string().min(32, 'must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'must be at least 32 characters'),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL: z.string().default('7d'),

  // AES-256-GCM needs exactly 32 bytes; supply as 64 hex chars.
  ENCRYPTION_KEY: z.string().regex(/^[0-9a-fA-F]{64}$/, 'must be 64 hex characters (32 bytes)'),
  CURSOR_SECRET: z.string().min(32, 'must be at least 32 characters'),
  IPWHO_API_KEY: z.string().min(1).optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // The logger depends on config, so startup errors go straight to stderr.
  const lines = parsed.error.issues.map((issue) => `  ${issue.path.join('.')}: ${issue.message}`);
  process.stderr.write(`Invalid environment variables\n${lines.join('\n')}\n`);
  process.exit(1);
}

const env = parsed.data;

const config = {
  env: env.NODE_ENV,
  port: env.PORT,
  trustProxy: env.TRUST_PROXY,
  shutdownTimeoutMs: env.SHUTDOWN_TIMEOUT_MS,
  bcryptRounds: env.BCRYPT_ROUNDS,
  logLevel: env.LOG_LEVEL,
  cursorSecret: env.CURSOR_SECRET,
  db: {
    name: env.DB_NAME,
    user: env.DB_USER,
    password: env.DB_PASS,
    host: env.DB_HOST,
    port: env.DB_PORT,
    logging: env.DB_LOGGING,
  },
  redis: {
    url: env.REDIS_URL,
    defaultTtl: env.REDIS_DEFAULT_TTL,
  },
} as const;

export default config;
