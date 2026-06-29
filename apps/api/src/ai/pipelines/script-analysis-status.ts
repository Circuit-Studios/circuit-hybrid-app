import { ScriptAnalysisStatus, type Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { logger } from '../../lib/logger.js';
import { emitToProject } from '../../realtime/socket.js';
import { LlmError, toSafeAnalysisError } from '../llm/errors.js';

export async function updateScriptAnalysisStatus(
  scriptId: string,
  status: ScriptAnalysisStatus,
): Promise<void> {
  const updated = await prisma.script.update({
    where: { id: scriptId },
    data: {
      analysisStatus: status,
      analysisStartedAt: status === 'EXTRACTING_TEXT' ? new Date() : undefined,
    },
    select: { id: true, projectId: true, analysisStatus: true },
  });
  emitToProject(updated.projectId, 'script.analysis.updated', {
    scriptId: updated.id,
    status: updated.analysisStatus,
  });
}

export async function failScriptAnalysis(
  scriptId: string,
  projectId: string,
  error: unknown,
  safeMessage?: string,
): Promise<void> {
  // Log the full provider detail internally (status/model/stage live on
  // LlmError); never persist it to the mobile-visible analysisError field.
  logger.error(
    {
      scriptId,
      projectId,
      detail: error instanceof Error ? error.message : String(error),
      ...(error instanceof LlmError
        ? { provider: error.provider, statusCode: error.statusCode, stage: error.stage }
        : {}),
    },
    'script_analysis_failed',
  );

  await prisma.script.update({
    where: { id: scriptId },
    data: {
      analysisStatus: ScriptAnalysisStatus.FAILED,
      analysisError: safeMessage ?? toSafeAnalysisError(error),
      analysisEndedAt: new Date(),
    },
  });
  emitToProject(projectId, 'script.analysis.updated', {
    scriptId,
    status: 'FAILED',
  });
}

export async function completeScriptPlanning(
  scriptId: string,
  projectId: string,
  planningSummary: Record<string, unknown>,
): Promise<void> {
  await prisma.script.update({
    where: { id: scriptId },
    data: {
      analysisStatus: ScriptAnalysisStatus.COMPLETED,
      analysisError: null,
      analysisEndedAt: new Date(),
      aiSummary: planningSummary as Prisma.InputJsonValue,
    },
  });
  emitToProject(projectId, 'script.analysis.updated', {
    scriptId,
    status: 'COMPLETED',
  });
}
