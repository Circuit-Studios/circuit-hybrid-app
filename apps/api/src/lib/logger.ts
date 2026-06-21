import pino, { type LoggerOptions } from 'pino';
import { env } from '../config/env.js';

const isProduction = env.NODE_ENV === 'production';

const appEnvironment =
  process.env.APP_ENV ??
  process.env.CIRCUIT_ENV ??
  env.NODE_ENV;

const release =
  process.env.RENDER_GIT_COMMIT ??
  process.env.GIT_SHA ??
  process.env.npm_package_version;

const loggerOptions: LoggerOptions = {
  level: env.LOG_LEVEL ?? (isProduction ? 'info' : 'debug'),

  base: {
    service: 'circuit-api',
    environment: appEnvironment,
    release,
  },

  timestamp: pino.stdTimeFunctions.isoTime,

  formatters: {
    level(label) {
      return { level: label };
    },
  },

  redact: {
    censor: '[REDACTED]',
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'res.headers["set-cookie"]',

      'headers.authorization',
      'headers.cookie',

      'password',
      '*.password',
      'body.password',
      'body.signup.password',

      'otp',
      '*.otp',
      'code',
      '*.code',
      'body.code',

      'email',
      '*.email',
      'body.email',
      'body.signup.email',

      'phone',
      '*.phone',
      'body.phone',
      'body.signup.phone',

      'target',
      '*.target',

      'token',
      '*.token',
      'accessToken',
      '*.accessToken',
      'refreshToken',
      '*.refreshToken',

      'DATABASE_URL',
      'OPENAI_API_KEY',
      'RESEND_API_KEY',
      'AWS_SECRET_ACCESS_KEY',
      'SUPABASE_SERVICE_ROLE_KEY',
    ],
  },

  ...(isProduction
    ? {}
    : {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:HH:MM:ss',
            singleLine: true,
          },
        },
      }),
};

export const logger = pino(loggerOptions);
