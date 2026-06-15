import { appConfig, type AppEnv } from '@/config/appEnv';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_RANK: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const REDACT_KEY_PATTERN =
  /password|authorization|token|otp|code|secret|apikey|api_key|credential/i;

function defaultLogLevel(appEnv: AppEnv): LogLevel {
  return appEnv === 'production' || appEnv === 'preview' ? 'info' : 'debug';
}

function resolveMinLevel(): LogLevel {
  const raw = process.env.EXPO_PUBLIC_LOG_LEVEL?.trim().toLowerCase();
  if (raw === 'debug' || raw === 'info' || raw === 'warn' || raw === 'error') {
    return raw;
  }
  return defaultLogLevel(appConfig.appEnv);
}

const minLevel = resolveMinLevel();

function shouldLog(level: LogLevel): boolean {
  return LEVEL_RANK[level] >= LEVEL_RANK[minLevel];
}

function sanitize(value: unknown, key = ''): unknown {
  if (value == null) return value;
  if (key && REDACT_KEY_PATTERN.test(key)) return '[REDACTED]';
  if (Array.isArray(value)) return value.map(item => sanitize(item));
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(record)) {
      out[k] = sanitize(v, k);
    }
    return out;
  }
  return value;
}

function buildPayload(level: LogLevel, msg: string, context?: Record<string, unknown>) {
  return {
    level,
    service: 'circuit-mobile',
    environment: appConfig.appEnv,
    msg,
    ...(context ? (sanitize(context) as Record<string, unknown>) : {}),
  };
}

function emit(level: LogLevel, msg: string, context?: Record<string, unknown>): void {
  if (!shouldLog(level)) return;
  const payload = buildPayload(level, msg, context);
  const prefix = `[circuit] ${msg}`;
  switch (level) {
    case 'error':
      console.error(prefix, payload);
      break;
    case 'warn':
      console.warn(prefix, payload);
      break;
    default:
      console.log(prefix, payload);
      break;
  }
}

export const logger = {
  debug(msg: string, context?: Record<string, unknown>): void {
    emit('debug', msg, context);
  },
  info(msg: string, context?: Record<string, unknown>): void {
    emit('info', msg, context);
  },
  warn(msg: string, context?: Record<string, unknown>): void {
    emit('warn', msg, context);
  },
  error(msg: string, context?: Record<string, unknown>): void {
    emit('error', msg, context);
  },
};

function apiResponseLevel(status: number | string): LogLevel {
  if (typeof status === 'number') {
    if (status >= 500) return 'error';
    if (status >= 400) return 'warn';
    return 'debug';
  }
  return 'error';
}

/** Log an outgoing API call; returns start timestamp for duration tracking. */
export function logApiRequest(method: string, url: string, requestId: string): number {
  logger.debug('api request', {
    method: method.toUpperCase(),
    url,
    requestId,
  });
  return Date.now();
}

/** Log an API response with level derived from status (matches backend pino-http rules). */
export function logApiResponse(
  method: string,
  url: string,
  status: number | string,
  startTime: number,
  requestId?: string,
): void {
  const durationMs = startTime > 0 ? Date.now() - startTime : undefined;
  const context = {
    method: method.toUpperCase(),
    url,
    status,
    requestId,
    durationMs,
  };
  const level = apiResponseLevel(status);
  logger[level]('api response', context);
}
