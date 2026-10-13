import type { Server } from 'node:http';
import app from './app';
import config from './config';
import { sequelize } from './models';
import { connectRedis, disconnectRedis } from './db/redis';

let server: Server | undefined;

async function start(): Promise<void> {
  try {
    await sequelize.authenticate();
    console.log('Database connection established');

    await connectRedis();
    const x:number = 'a';
    server = app.listen(config.port, () => {
      console.log(`Server started on port ${config.port}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

async function shutdown(signal: NodeJS.Signals): Promise<void> {
  console.log(`${signal} received, shutting down`);

  setTimeout(() => {
    console.error('Shutdown timed out, forcing exit');
    process.exit(1);
  }, config.shutdownTimeoutMs).unref();

  if (server) {
    const httpServer = server;
    await new Promise<void>((resolve) => {
      httpServer.close(() => {
        resolve();
      });
    });
  }
  await Promise.allSettled([sequelize.close(), disconnectRedis()]);
  console.log('Shutdown complete');
  process.exit(0);
}

process.on('SIGTERM', (signal) => void shutdown(signal));
process.on('SIGINT', (signal) => void shutdown(signal));

void start();
