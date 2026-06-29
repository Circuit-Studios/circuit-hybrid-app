// Conflict-scanner queue. Coalesces rapid-fire shoot-day/scene edits and runs
// the scan with retries; falls back to inline execution when Redis is unset.

import { createQueueRunner } from './queue-runner.js';
import { scanProjectConflicts, type ConflictScanInput } from './conflict-detector.service.js';

const runner = createQueueRunner<ConflictScanInput>({
  name: 'circuit.conflicts',
  process: scanProjectConflicts,
  // Coalesce so rapid-fire shoot-day edits don't fan out into 50 scan jobs.
  jobId: (input) => `scan:${input.projectId}:${input.shootDayId ?? 'all'}`,
  concurrency: 3,
  lockDuration: 60_000,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2_000 },
    // Trim job history so the queue doesn't bloat under steady load.
    removeOnComplete: { count: 1_000, age: 24 * 60 * 60 },
    removeOnFail: { count: 5_000, age: 7 * 24 * 60 * 60 },
  },
});

export const enqueueConflictScan = runner.enqueue;
export const startConflictWorker = runner.startWorker;
export const stopConflictWorker = runner.stopWorker;
