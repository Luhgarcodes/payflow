import { migrator, seeder } from './migrate';
import { sequelize } from './index';

const commands: Record<string, () => Promise<unknown>> = {
  migrate: () => migrator.up(),
  'migrate:undo': () => migrator.down(),
  seed: () => seeder.up(),
  'seed:undo': () => seeder.down({ to: 0 }),
};

async function main(): Promise<void> {
  const cmd = process.argv[2];
  const run = cmd ? commands[cmd] : undefined;
  if (!run) {
    console.error(`Unknown command: ${String(cmd)}`);
    process.exit(1);
  }
  try {
    await run();
    console.log(`${cmd} completed successfully`);
  } catch (err) {
    console.error(`${cmd} failed:`, err);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

void main();
