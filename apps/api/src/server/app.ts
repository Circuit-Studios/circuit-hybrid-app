import express, { type Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import { pinoHttp } from 'pino-http';
import type { IncomingMessage } from 'node:http';
import { randomUUID } from 'node:crypto';
import rateLimit from 'express-rate-limit';

import { env, corsOrigins } from '../config/env.js';
import { logger } from '../lib/logger.js';
import { errorHandler } from '../middleware/error.js';
import { authPublicRouter, authProtectedRouter } from '../modules/auth/auth.routes.js';
import { emailPublicRouter } from '../modules/email/email.routes.js';
import projectsRoutes from '../modules/projects/projects.routes.js';
import scriptsRoutes from '../modules/scripts/scripts.routes.js';
import membersRoutes from '../modules/members/members.routes.js';
import workspaceRoutes from '../modules/workspace/workspace.routes.js';
import taskSuggestionsRoutes from '../modules/task-suggestions/task-suggestions.routes.js';
import tasksRoutes from '../modules/tasks/tasks.routes.js';
import shootDaysRoutes from '../modules/shoot-days/shoot-days.routes.js';
import charactersRoutes from '../modules/characters/characters.routes.js';
import scenesRoutes from '../modules/scenes/scenes.routes.js';
import departmentsRoutes from '../modules/departments/departments.routes.js';
import notificationsRoutes from '../notifications/notifications.routes.js';
import homeRoutes from '../modules/home/home.routes.js';
import appConfigRoutes from '../modules/app/app-config.routes.js';
import { prisma } from '../lib/prisma.js';

function resolveRequestId(incoming: string | string[] | undefined): string {
  const raw = Array.isArray(incoming) ? incoming[0] : incoming;
  if (typeof raw === 'string') {
    const sanitized = raw
      .trim()
      .replace(/[\r\n\t]/g, '')
      .slice(0, 128);
    if (sanitized.length > 0) return sanitized;
  }
  return randomUUID();
}

/**
 * Builds the Express app with all middleware and routes wired up, but does not
 * listen, attach a socket server, or start background workers. Production
 * bootstrap lives in `index.ts`; tests import this to exercise routes directly.
 */
export function createApp(): Express {
  const app = express();

  // Render terminates TLS and sets X-Forwarded-For; rate-limit needs trust proxy
  // to read the client IP instead of throwing ERR_ERL_UNEXPECTED_X_FORWARDED_FOR.
  app.set('trust proxy', 1);

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
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
      exposedHeaders: ['X-Request-Id'],
    }),
  );
  app.use(
    pinoHttp({
      logger,

      genReqId: (req, res) => {
        const requestId = resolveRequestId(req.headers['x-request-id']);
        res.setHeader('x-request-id', requestId);
        return requestId;
      },

      customLogLevel: (_req, res, err) => {
        if (err || res.statusCode >= 500) return 'error';
        if (res.statusCode >= 400) return 'warn';
        return 'info';
      },

      autoLogging: {
        ignore: (req: IncomingMessage) => req.url === '/health',
      },

      customSuccessMessage: (req, res) => {
        return `${req.method} ${req.url} ${res.statusCode}`;
      },

      customErrorMessage: (req, res) => {
        return `${req.method} ${req.url} failed with ${res.statusCode}`;
      },

      serializers: {
        req(req) {
          return {
            id: req.id,
            method: req.method,
            url: req.url,
            remoteAddress: req.remoteAddress,
            userAgent: req.headers['user-agent'],
          };
        },
        res(res) {
          return {
            statusCode: res.statusCode,
          };
        },
      },
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

  app.use(appConfigRoutes);

  app.use('/auth', authLimiter, authPublicRouter);
  app.use('/auth', authProtectedRouter);
  app.use('/email', authLimiter, emailPublicRouter);

  app.use('/projects', projectsRoutes);

  // `scripts`, `members`, `workspace`, `tasks`, `shoot-days` all use absolute
  // paths under either /projects/:id/... or top-level /scripts/:id/... — they
  // mount at "/" so each router owns its own URL space.
  app.use('/', scriptsRoutes);
  app.use('/', membersRoutes);
  app.use('/', workspaceRoutes);
  app.use('/', taskSuggestionsRoutes);
  app.use('/', tasksRoutes);
  app.use('/', shootDaysRoutes);
  app.use('/', charactersRoutes);
  app.use('/', scenesRoutes);
  app.use('/', departmentsRoutes);
  app.use('/', notificationsRoutes);
  app.use('/', homeRoutes);

  app.use((req, res, next) => {
    if (res.headersSent) return next();
    res.status(404).json({ error: { message: `No route for ${req.method} ${req.path}` } });
  });

  app.use(errorHandler);

  return app;
}
