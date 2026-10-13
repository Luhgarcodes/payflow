import pino from 'pino';
import config from '../config';

const SENSITIVE_KEYS = [
  'password',
  'passwordHash',
  'password_hash',
  'pin',
  'pinHash',
  'pin_hash',
  'otp',
  'token',
  'accessToken',
  'refreshToken',
  'access_token',
  'refresh_token',
  'pan',
  'accountNumber',
  'account_number',
];

// Redaction paths are matched literally, so each key is covered at the top level and up to
// three levels deep (e.g. req.body.password, err.details.user.pan).
export const REDACT_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'res.headers["set-cookie"]',
  ...SENSITIVE_KEYS.flatMap((key) => [key, `*.${key}`, `*.*.${key}`, `*.*.*.${key}`]),
];

export const logger = pino({
  level: config.logLevel,
  base: { env: config.env },
  redact: { paths: REDACT_PATHS, censor: '[REDACTED]' },
  ...(config.env === 'development' && {
    transport: {
      target: 'pino-pretty',
      options: { colorize: true, translateTime: 'SYS:HH:MM:ss.l', ignore: 'pid,hostname,env' },
    },
  }),
});
