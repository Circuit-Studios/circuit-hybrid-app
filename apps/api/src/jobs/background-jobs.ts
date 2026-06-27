import { BackgroundJobKind, BackgroundJobStatus } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { logger } from '../lib/logger.js';
import { isFeatureEnabled } from '../config/features.js';
import { analyzeScript } from '../ai/pipelines/script-analysis.pipeline.js';
import { runShootingPlanPipeline } from '../ai/pipelines/shooting-plan.pipeline.js';

export async function createScriptAnalysisJob(scriptId: string, projectId: string) {
  return prisma.backgroundJob.create({
    data: {
      kind: BackgroundJobKind.SCRIPT_ANALYSIS,
      status: BackgroundJobStatus.PENDING,
      projectId,
      scriptId,
    },
  });
}

/**
 * Runs script analysis jobs. Prefers the batched shooting-plan pipeline when enabled;
 * falls back to legacy 6-stage analyzeScript only when shooting plan is off.
 */
export async function runScriptAnalysisJob(scriptId: string): Promise<void> {
  const shootingPlanEnabled = await isFeatureEnabled('scripts.shootingPlan');
  if (shootingPlanEnabled) {
    await runShootingPlanPipeline(scriptId);
    return;
  }

  const legacyEnabled = await isFeatureEnabled('scripts.aiAnalysis');
  if (legacyEnabled) {
    await analyzeScript(scriptId);
    return;
  }

  throw new Error('No script analysis pipeline is enabled');
}

export async function processBackgroundJob(jobId: string): Promise<void> {
  const job = await prisma.backgroundJob.findUnique({ where: { id: jobId } });
  if (!job) throw new Error(`Background job ${jobId} not found`);
  if (job.status !== BackgroundJobStatus.PENDING && job.status !== BackgroundJobStatus.FAILED) {
    return;
  }

  const log = logger.child({ jobId, scriptId: job.scriptId, kind: job.kind });

  await prisma.backgroundJob.update({
    where: { id: jobId },
    data: { status: BackgroundJobStatus.RUNNING, startedAt: new Date(), error: null },
  });

  try {
    if (!job.scriptId) throw new Error('Script analysis job missing scriptId');

    if (job.kind === BackgroundJobKind.SCRIPT_ANALYSIS) {
      await runScriptAnalysisJob(job.scriptId);
    } else if (job.kind === BackgroundJobKind.SHOOTING_PLAN) {
      if (!(await isFeatureEnabled('scripts.shootingPlan'))) {
        throw new Error('Shooting plan pipeline is disabled');
      }
      await runShootingPlanPipeline(job.scriptId);
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
        error: message.slice(0, 1000),
        endedAt: new Date(),
      },
    });
    log.error({ error: message }, 'background_job_failed');
    throw error;
  }
}

export function enqueueBackgroundJob(jobId: string): void {
  void processBackgroundJob(jobId).catch((err) => {
    logger.error({ err, jobId }, 'enqueueBackgroundJob failure');
  });
}
