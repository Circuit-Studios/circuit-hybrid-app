// Lazy Redis connection used by BullMQ. We keep ONE shared ioredis instance
// for the queue producer and a separate one for the worker (BullMQ requires
// distinct connections to subscribe / block on `BRPOPLPUSH`).
//
// If REDIS_URL is unset we return null and callers fall back to running
// jobs inline. This keeps the dev story friction-free: a developer who
// just wants to poke at /projects/:id/health doesn't need to spin Redis.

// ioredis ships its constructor as both the default and a named `Redis`
// export. The named export is more ergonomic under NodeNext ESM because we
// don't need to chase the .default round trip.
import { Redis as IORedis, type Redis as RedisInstance } from 'ioredis';
import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';

let producerConn: RedisInstance | null = null;
let workerConn: RedisInstance | null = null;

function makeConnection(role: 'producer' | 'worker'): RedisInstance | null {
  if (!env.REDIS_URL) return null;
  // maxRetriesPerRequest must be null for BullMQ workers; we apply the same
  // here for the producer too to avoid silently dropping enqueues during a
  // Redis blip.
  const conn = new IORedis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
    lazyConnect: false,
  });
  conn.on('error', (err: Error) => logger.error({ err, role }, 'Redis connection error'));
  conn.on('connect', () => logger.info({ role }, 'Redis connected'));
  return conn;
}

export function getProducerConnection(): RedisInstance | null {
  if (!env.REDIS_URL) return null;
  if (!producerConn) producerConn = makeConnection('producer');
  return producerConn;
}

export function getWorkerConnection(): RedisInstance | null {
  if (!env.REDIS_URL) return null;
  if (!workerConn) workerConn = makeConnection('worker');
  return workerConn;
}

export async function disconnectRedis(): Promise<void> {
  await Promise.all([producerConn?.quit(), workerConn?.quit()]);
  producerConn = null;
  workerConn = null;
}
