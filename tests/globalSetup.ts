import { runDbCommand } from './dbCli';

export default function globalSetup(): void {
  runDbCommand('create');
  runDbCommand('migrate:reset');
  runDbCommand('migrate');
}
