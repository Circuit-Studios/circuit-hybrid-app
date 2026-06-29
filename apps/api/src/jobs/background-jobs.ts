import { BackgroundJobKind, BackgroundJobStatus } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { logger } from '../lib/logger.js';
import { isFeatureEnabled } from '../config/features.js';
import { toSafeAnalysisError } from '../ai/llm/errors.js';
import { failScriptAnalysis } from '../ai/pipelines/script-analysis-status.js';
import { runShootingPlanPipeline } from '../ai/pipelines/shooting-plan.pipeline.js';

/**
 * A RUNNING job untouched for this long was almost certainly orphaned by a
 * crash/restart (the script worker's lock is 5 min, so 15 min is comfortably
 * past any healthy run).
 */
const STALE_RUNNING_MS = 15 * 60_000;

const RESTART_INTERRUPTED_MESSAGE = 'Analysis was interrupted by a server restart. Please try again.';

export async function createScriptAnalysisJob(scriptId: string, projectId: string) {
  return prisma.backgroundJob.create({
    data: {
      kind: BackgroundJobKind.SHOOTING_PLAN,
      status: BackgroundJobStatus.PENDING,
      projectId,
      scriptId,
    },
  });
}

/** Runs the batched shooting-plan pipeline (scene split → suggestions → plan). */
export async function runScriptAnalysisJob(scriptId: string): Promise<void> {
  if (!(await isFeatureEnabled('scripts.shootingPlan'))) {
    throw new Error('Shooting plan pipeline is disabled');
  }
  await runShootingPlanPipeline(scriptId);
}

export async function processBackgroundJob(jobId: string): Promise<void> {
  const job = await prisma.backgroundJob.findUnique({ where: { id: jobId } });
  if (!job) throw new Error(`Background job ${jobId} not found`);

  const log = logger.child({ jobId, scriptId: job.scriptId, kind: job.kind });

  // Skip only already-finished work. PENDING/FAILED are (re)tried, and a
  // RUNNING row means a previous attempt died mid-run (stalled job re-delivered
  // by BullMQ), so we reprocess it for crash recovery.
  if (job.status === BackgroundJobStatus.SUCCEEDED) {
    log.debug('background_job_already_succeeded');
    return;
  }

  await prisma.backgroundJob.update({
    where: { id: jobId },
    data: { status: BackgroundJobStatus.RUNNING, startedAt: new Date(), error: null },
  });

  try {
    if (!job.scriptId) throw new Error('Script analysis job missing scriptId');

    if (job.kind === BackgroundJobKind.SHOOTING_PLAN) {
      await runScriptAnalysisJob(job.scriptId);
    } else {
      throw new Error(`Unsupported background job kind: ${job.kind}`);
    }

    await prisma.backgroundJob.update({
      where: { id: jobId },
      data: { status: BackgroundJobStatus.SUCCEEDED, endedAt: new Date() },
    });
    log.info('background_job_succeeded');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await prisma.backgroundJob.update({
      where: { id: jobId },
      data: {
        status: BackgroundJobStatus.FAILED,
        // Safe summary only — provider body details stay in the internal log.
        error: toSafeAnalysisError(error),
        endedAt: new Date(),
      },
    });
    log.error({ error: message }, 'background_job_failed');
    throw error;
  }
}

/**
 * Reconcile durable job state with reality on API startup.
 *
 *  - Stale RUNNING jobs (orphaned by a crash) are marked FAILED. The pipeline's
 *    writes aren't idempotent, so we surface the failure for a manual retry
 *    instead of silently re-running and risking duplicate plans/suggestions.
 *  - PENDING jobs never started, so they are safe to (re)enqueue — durable via
 *    BullMQ when Redis is configured, inline otherwise.
 *
 * `enqueue` is injected (rather than imported) to keep this module free of the
 * queue layer, which itself depends on `processBackgroundJob`.
 */
export async function recoverInterruptedJobs(
  enqueue: (jobId: string) => Promise<void>,
): Promise<void> {
  const staleBefore = new Date(Date.now() - STALE_RUNNING_MS);
  const stale = await prisma.backgroundJob.findMany({
    where: {
      status: BackgroundJobStatus.RUNNING,
      OR: [{ startedAt: { lt: staleBefore } }, { startedAt: null }],
    },
    select: { id: true, scriptId: true, projectId: true },
  });

  for (const job of stale) {
    await prisma.backgroundJob.update({
      where: { id: job.id },
      data: {
        status: BackgroundJobStatus.FAILED,
        error: RESTART_INTERRUPTED_MESSAGE,
        endedAt: new Date(),
      },
    });
    // Reconcile the Script too, or mobile would poll a non-terminal status
    // forever.
    if (job.scriptId) {
      await failScriptAnalysis(
        job.scriptId,
        job.projectId,
        new Error('Interrupted by server restart'),
        RESTART_INTERRUPTED_MESSAGE,
      );
    }
  }
  if (stale.length > 0) {
    logger.warn({ count: stale.length }, 'background_jobs_failed_after_restart');
  }

  const pending = await prisma.backgroundJob.findMany({
    where: { status: BackgroundJobStatus.PENDING },
    select: { id: true },
    orderBy: { createdAt: 'asc' },
  });
  for (const job of pending) {
    await enqueue(job.id);
  }
  if (pending.length > 0) {
    logger.info({ count: pending.length }, 'background_jobs_resumed');
  }
}
