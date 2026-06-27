import { ScriptAnalysisStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { emitToProject } from '../../realtime/socket.js';

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
): Promise<void> {
  const message = error instanceof Error ? error.message : String(error);
  await prisma.script.update({
    where: { id: scriptId },
    data: {
      analysisStatus: ScriptAnalysisStatus.FAILED,
      analysisError: message.slice(0, 1000),
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
      aiSummary: planningSummary,
    },
  });
  emitToProject(projectId, 'script.analysis.updated', {
    scriptId,
    status: 'COMPLETED',
  });
}
