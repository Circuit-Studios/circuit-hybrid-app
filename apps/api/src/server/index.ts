import { createServer } from 'node:http';

import { env, corsOrigins } from '../config/env.js';
import { logger } from '../lib/logger.js';
import { prisma } from '../lib/prisma.js';
import { initSocket } from '../realtime/socket.js';
import { startConflictWorker, stopConflictWorker } from '../queues/conflicts.queue.js';
import { disconnectRedis } from '../queues/redis.js';
import { createApp } from './app.js';

const app = createApp();

const httpServer = createServer(app);
initSocket(httpServer, corsOrigins);
const conflictWorker = startConflictWorker();

httpServer.listen(env.PORT, () => {
  logger.info(
    {
      port: env.PORT,
      env: env.NODE_ENV,
      socket: true,
      conflictWorker: conflictWorker ? 'queued' : 'inline',
      storage: 'local',
    },
    'Circuit backend listening',
  );
});

const shutdown = async (signal: string) => {
  logger.info({ signal }, 'Shutting down');
  await stopConflictWorker();
  await disconnectRedis();
  await new Promise<void>((resolve) => httpServer.close(() => resolve()));
  await prisma.$disconnect();
  process.exit(0);
};
process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
