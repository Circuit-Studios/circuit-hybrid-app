// Shared BullMQ producer + worker factory. Every background job in the API
// flows through one of these runners so we keep a SINGLE job runtime (BullMQ)
// instead of hand-rolling per-feature execution.
//
// If REDIS_URL is unset we fall back to running the work in-process so the dev
// story stays friction-free — no Redis required to exercise a feature locally.

import { Queue, Worker, type ConnectionOptions, type Job, type JobsOptions } from 'bullmq';
import { createWorkerConnection, getProducerConnection } from './redis.js';
import { logger } from '../lib/logger.js';

export interface QueueRunnerConfig<T> {
  /** Queue + job name. */
  name: string;
  /** The actual unit of work, shared by the worker and the inline fallback. */
  process: (data: T) => Promise<unknown>;
  /** Stable id used to coalesce duplicate enqueues (e.g. rapid-fire edits). */
  jobId?: (data: T) => string;
  concurrency?: number;
  /** Raise for long-running jobs so they aren't flagged as stalled mid-run. */
  lockDuration?: number;
  defaultJobOptions?: JobsOptions;
  /**
   * When true, the inline (no-Redis) fallback is fire-and-forget rather than
   * awaited. Use for long jobs that must not block the request path.
   */
  inlineDetached?: boolean;
}

export interface QueueRunner<T> {
  /** Enqueue work; runs inline when Redis is not configured. */
  enqueue(data: T): Promise<void>;
  startWorker(): Worker<T> | null;
  stopWorker(): Promise<void>;
}

export function createQueueRunner<T>(config: QueueRunnerConfig<T>): QueueRunner<T> {
  const {
    name,
    process: handler,
    jobId,
    concurrency = 3,
    lockDuration,
    defaultJobOptions,
    inlineDetached = false,
  } = config;

  let queue: Queue<T> | null = null;
  let worker: Worker<T> | null = null;

  function getQueue(): Queue<T> | null {
    if (queue) return queue;
    const conn = getProducerConnection();
    if (!conn) return null;
    queue = new Queue<T>(name, { connection: conn as ConnectionOptions, defaultJobOptions });
    return queue;
  }

  async function runInline(data: T): Promise<void> {
    try {
      await handler(data);
    } catch (err) {
      logger.error({ err, queue: name, data }, 'Inline job execution failed');
    }
  }

  return {
    async enqueue(data: T): Promise<void> {
      const q = getQueue();
      if (!q) {
        if (inlineDetached) void runInline(data);
        else await runInline(data);
        return;
      }
      // BullMQ's add() uses conditional types (ExtractNameType/ExtractDataType)
      // that TS can't resolve for an unconstrained generic T, so narrow the
      // method signature to the plain shape we actually use.
      const add = q.add.bind(q) as (
        n: string,
        d: T,
        o?: JobsOptions,
      ) => Promise<unknown>;
      await add(name, data, jobId ? { jobId: jobId(data) } : undefined);
    },

    startWorker(): Worker<T> | null {
      if (worker) return worker;
      const conn = createWorkerConnection();
      if (!conn) {
        logger.warn({ queue: name }, 'REDIS_URL not set — jobs run inline only');
        return null;
      }
      worker = new Worker<T>(name, (job: Job<T>) => handler(job.data) as Promise<unknown>, {
        connection: conn as ConnectionOptions,
        concurrency,
        ...(lockDuration ? { lockDuration } : {}),
      });
      worker.on('failed', (job, err) =>
        logger.error({ queue: name, jobId: job?.id, err, data: job?.data }, 'Job failed'),
      );
      worker.on('error', (err) => logger.error({ queue: name, err }, 'Worker error'));
      logger.info({ queue: name }, 'Queue worker started');
      return worker;
    },

    async stopWorker(): Promise<void> {
      await worker?.close();
      worker = null;
      await queue?.close();
      queue = null;
    },
  };
}
