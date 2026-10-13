import { execFileSync } from 'node:child_process';
import path from 'node:path';

const root = path.resolve(__dirname, '..');
const tsxCli = path.join(root, 'node_modules', 'tsx', 'dist', 'cli.mjs');

/** Runs a src/db/cli.ts command against the test database. */
export const runDbCommand = (command: string): void => {
  execFileSync(process.execPath, [tsxCli, 'src/db/cli.ts', command], {
    cwd: root,
    env: { ...process.env, NODE_ENV: 'test' },
    stdio: 'inherit',
  });
};
