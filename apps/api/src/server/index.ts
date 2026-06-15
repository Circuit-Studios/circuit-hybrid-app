import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import { pinoHttp } from 'pino-http';
import type { IncomingMessage } from 'node:http';
import { createServer } from 'node:http';
import rateLimit from 'express-rate-limit';

import { env, corsOrigins } from '../config/env.js';
import { logger } from '../lib/logger.js';
import { errorHandler } from '../middleware/error.js';
import { authPublicRouter, authProtectedRouter } from '../modules/auth/auth.routes.js';
import projectsRoutes from '../modules/projects/projects.routes.js';
import scriptsRoutes from '../modules/scripts/scripts.routes.js';
import membersRoutes from '../modules/members/members.routes.js';
import workspaceRoutes from '../modules/workspace/workspace.routes.js';
import tasksRoutes from '../modules/tasks/tasks.routes.js';
import shootDaysRoutes from '../modules/shoot-days/shoot-days.routes.js';
import charactersRoutes from '../modules/characters/characters.routes.js';
import scenesRoutes from '../modules/scenes/scenes.routes.js';
import departmentsRoutes from '../modules/departments/departments.routes.js';
import notificationsRoutes from '../notifications/notifications.routes.js';
import { prisma } from '../lib/prisma.js';
import { initSocket } from '../realtime/socket.js';
import { startConflictWorker, stopConflictWorker } from '../queues/conflicts.queue.js';
import { disconnectRedis } from '../queues/redis.js';

const app = express();

// Render terminates TLS and sets X-Forwarded-For; rate-limit needs trust proxy
// to read the client IP instead of throwing ERR_ERL_UNEXPECTED_X_FORWARDED_FOR.
if (env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

app.disable('x-powered-by');
app.use(helmet());
app.use(compression());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    origin:
      env.NODE_ENV === 'production' && corsOrigins.length === 0
        ? false
        : corsOrigins.length > 0
        ? corsOrigins
        : true,
    credentials: true,
  }),
);
app.use(
  pinoHttp({
    logger,
    autoLogging: { ignore: (req: IncomingMessage) => req.url === '/health' },
  }),
);

const authLimiter = rateLimit({
  windowMs: 60_000,
  limit: env.NODE_ENV === 'production' ? 10 : 100,
  standardHeaders: true,
  legacyHeaders: false,
});

app.get('/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', uptimeSeconds: Math.floor(process.uptime()) });
  } catch (err) {
    res.status(503).json({ status: 'degraded', error: (err as Error).message });
  }
});

app.use('/auth', authLimiter, authPublicRouter);
app.use('/auth', authProtectedRouter);

app.use('/projects', projectsRoutes);

// `scripts`, `members`, `workspace`, `tasks`, `shoot-days` all use absolute
// paths under either /projects/:id/... or top-level /scripts/:id/... — they
// mount at "/" so each router owns its own URL space.
app.use('/', scriptsRoutes);
app.use('/', membersRoutes);
app.use('/', workspaceRoutes);
app.use('/', tasksRoutes);
app.use('/', shootDaysRoutes);
app.use('/', charactersRoutes);
app.use('/', scenesRoutes);
app.use('/', departmentsRoutes);
app.use('/', notificationsRoutes);

app.use((req, res, next) => {
  if (res.headersSent) return next();
  res.status(404).json({ error: { message: `No route for ${req.method} ${req.path}` } });
});

app.use(errorHandler);

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
  await new Promise<void>(resolve => httpServer.close(() => resolve()));
  await prisma.$disconnect();
  process.exit(0);
};
process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
