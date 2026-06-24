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
      if (await isFeatureEnabled('scripts.aiAnalysis')) {
        await analyzeScript(job.scriptId);
      }

      if (await isFeatureEnabled('scripts.shootingPlan')) {
        await runShootingPlanPipeline(job.scriptId);
      }
    } else if (job.kind === BackgroundJobKind.SHOOTING_PLAN) {
      if (await isFeatureEnabled('scripts.shootingPlan')) {
        await runShootingPlanPipeline(job.scriptId);
      }
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
