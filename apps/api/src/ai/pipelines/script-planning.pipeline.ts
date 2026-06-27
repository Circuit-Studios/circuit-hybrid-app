import { prisma } from '../../lib/prisma.js';
import { runShootingPlanPipeline } from './shooting-plan.pipeline.js';

/**
 * Director-facing script planning pipeline:
 * PDF text → scene extraction → task suggestions → shooting plan.
 *
 * Stores reviewable suggestions — does not create final Task or ShootDay rows.
 */
export async function generateScriptPlanningAnalysis({
  projectId,
  scriptId,
}: {
  projectId: string;
  scriptId: string;
}): Promise<void> {
  const script = await prisma.script.findUnique({
    where: { id: scriptId },
    select: { projectId: true },
  });
  if (!script) throw new Error(`Script ${scriptId} not found`);
  if (script.projectId !== projectId) {
    throw new Error(`Script ${scriptId} does not belong to project ${projectId}`);
  }

  await runShootingPlanPipeline(scriptId);
}

export { runShootingPlanPipeline } from './shooting-plan.pipeline.js';
