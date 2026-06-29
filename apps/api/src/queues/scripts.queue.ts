// Script-analysis (shooting-plan) queue. Drives the durable BackgroundJob row
// through the shared BullMQ runtime, so the long-running LLM pipeline gets
// retries + crash recovery instead of fire-and-forget execution. The
// BackgroundJob table remains the user-facing status projection that
// processBackgroundJob updates.

import { processBackgroundJob } from '../jobs/background-jobs.js';
import { createQueueRunner } from './queue-runner.js';

interface ScriptAnalysisJobData {
  /** BackgroundJob row id — the durable source of truth for status. */
  jobId: string;
}

const runner = createQueueRunner<ScriptAnalysisJobData>({
  name: 'circuit.script-analysis',
  process: ({ jobId }) => processBackgroundJob(jobId),
  // One queue job per BackgroundJob row; duplicate enqueues collapse.
  jobId: ({ jobId }) => jobId,
  concurrency: 2,
  // The pipeline (PDF extract → scene split → LLM stages) can run for minutes;
  // keep the lock long so a healthy job isn't mistaken for stalled.
  lockDuration: 5 * 60_000,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5_000 },
    removeOnComplete: { count: 500, age: 24 * 60 * 60 },
    removeOnFail: { count: 1_000, age: 7 * 24 * 60 * 60 },
  },
  // Don't block the HTTP 202 response in the no-Redis dev fallback.
  inlineDetached: true,
});

export function enqueueScriptAnalysis(jobId: string): Promise<void> {
  return runner.enqueue({ jobId });
}

export const startScriptAnalysisWorker = runner.startWorker;
export const stopScriptAnalysisWorker = runner.stopWorker;
