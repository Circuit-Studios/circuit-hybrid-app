import pino from 'pino';
import { env } from '../config/env.js';

const isProduction = env.NODE_ENV === 'production';

export const logger = pino({
  level: env.LOG_LEVEL,
  // JSON to stdout in production — Render aggregates logs from stdout.
  ...(isProduction
    ? {
        base: {
          service: 'circuit-api',
          environment: process.env.CIRCUIT_ENV ?? env.NODE_ENV,
        },
        timestamp: pino.stdTimeFunctions.isoTime,
        formatters: {
          level(label) {
            return { level: label };
          },
        },
      }
    : {
        transport: {
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'SYS:HH:MM:ss' },
        },
      }),
});
