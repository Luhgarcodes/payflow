import { runDbCommand } from './dbCli';

export default function globalTeardown(): void {
  runDbCommand('migrate:reset');
}
