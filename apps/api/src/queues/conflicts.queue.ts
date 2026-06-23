// BullMQ queue + worker for the conflict scanner. The queue acts as the
// public producer interface; the worker is started by the server on boot
// and consumes the same queue.
//
// If Redis isn't configured we run the scan inline so dev still works
// without standing up extra infra.

import { Queue, Worker, type ConnectionOptions, type Job } from 'bullmq';
import { getProducerConnection, getWorkerConnection } from './redis.js';
import { logger } from '../lib/logger.js';
import { scanProjectConflicts, type ConflictScanInput } from './conflict-detector.service.js';

const QUEUE_NAME = 'circuit.conflicts';

let queue: Queue<ConflictScanInput> | null = null;
let worker: Worker<ConflictScanInput> | null = null;

function getQueue(): Queue<ConflictScanInput> | null {
  if (queue) return queue;
  const conn = getProducerConnection();
  if (!conn) return null;
  queue = new Queue<ConflictScanInput>(QUEUE_NAME, {
    connection: conn as ConnectionOptions,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2_000 },
      // Trim job history so the queue doesn't bloat under steady load.
      removeOnComplete: { count: 1_000, age: 24 * 60 * 60 },
      removeOnFail: { count: 5_000, age: 7 * 24 * 60 * 60 },
    },
  });
  return queue;
}

// Producer surface used from request handlers (e.g. POST /shoot-days).
// Falls back to inline execution if Redis is not configured.
export async function enqueueConflictScan(input: ConflictScanInput): Promise<void> {
  const q = getQueue();
  if (!q) {
    // Inline mode. We DON'T await on the response path because the
    // scan can take a few seconds — but we await here for dev simplicity
    // so tests see synchronous behavior. Production should always have
    // Redis configured.
    try {
      await scanProjectConflicts(input);
    } catch (err) {
      logger.error({ err, input }, 'Inline conflict scan failed');
    }
    return;
  }
  // Coalesce: jobs with the same name and `jobId` collapse, so rapid-fire
  // shoot-day edits don't fan out into 50 scan jobs.
  const jobId = `scan:${input.projectId}:${input.shootDayId ?? 'all'}`;
  await q.add('scan', input, { jobId });
}

export function startConflictWorker(): Worker<ConflictScanInput> | null {
  if (worker) return worker;
  const conn = getWorkerConnection();
  if (!conn) {
    logger.warn('REDIS_URL not set — conflict scanner runs inline only');
    return null;
  }
  worker = new Worker<ConflictScanInput>(
    QUEUE_NAME,
    async (job: Job<ConflictScanInput>) => {
      return scanProjectConflicts(job.data);
    },
    { connection: conn as ConnectionOptions, concurrency: 3, lockDuration: 60_000 },
  );

  worker.on('completed', (job) => {
    logger.debug({ jobId: job.id, data: job.data }, 'Conflict job completed');
  });
  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err, data: job?.data }, 'Conflict job failed');
  });
  worker.on('error', (err) => logger.error({ err }, 'Conflict worker error'));

  logger.info('Conflict worker started');
  return worker;
}

export async function stopConflictWorker(): Promise<void> {
  await worker?.close();
  worker = null;
  await queue?.close();
  queue = null;
}
