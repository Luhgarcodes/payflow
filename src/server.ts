import type { Server } from 'node:http';
import app from './app';
import config from './config';
import { sequelize } from './models';
import { connectRedis, disconnectRedis } from './db/redis';
import { logger } from './utils/logger';

let server: Server | undefined;

async function start(): Promise<void> {
  try {
    await sequelize.authenticate();
    logger.info('Database connection established');

    await connectRedis();

    server = app.listen(config.port, () => {
      logger.info({ port: config.port }, 'Server started');
    });
  } catch (err) {
    logger.fatal({ err }, 'Failed to start server');
    process.exit(1);
  }
}

async function shutdown(signal: NodeJS.Signals): Promise<void> {
  logger.info({ signal }, 'Shutting down');

  setTimeout(() => {
    logger.error('Shutdown timed out, forcing exit');
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
  logger.info('Shutdown complete');
  process.exit(0);
}

process.on('SIGTERM', (signal) => void shutdown(signal));
process.on('SIGINT', (signal) => void shutdown(signal));

void start();
