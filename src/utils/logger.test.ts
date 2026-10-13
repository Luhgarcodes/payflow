import pino from 'pino';
import { REDACT_PATHS } from './logger';

const capture = (payload: object): Record<string, unknown> => {
  const lines: string[] = [];
  const log = pino(
    { redact: { paths: REDACT_PATHS, censor: '[REDACTED]' } },
    { write: (line: string) => lines.push(line) },
  );
  log.info(payload, 'test');
  return JSON.parse(lines[0] ?? '{}') as Record<string, unknown>;
};

describe('log redaction', () => {
  it.each(['password', 'pin', 'otp', 'token', 'refreshToken', 'pan', 'accountNumber'])(
    'redacts %s at every nesting level',
    (key) => {
      const line = capture({ [key]: 's1', a: { [key]: 's2', b: { [key]: 's3' } } });
      expect(JSON.stringify(line)).not.toMatch(/"s[123]"/);
    },
  );

  it('redacts authorization headers and keeps other fields', () => {
    const line = capture({ req: { headers: { authorization: 'Bearer x' } }, amount: 500 });
    expect(line).toMatchObject({
      req: { headers: { authorization: '[REDACTED]' } },
      amount: 500,
    });
  });
});
