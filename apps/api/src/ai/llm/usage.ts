import { LlmRunStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import type { LlmTokenUsage } from './types.js';

export interface LlmRunContext {
  provider: 'OPENAI' | 'NVIDIA';
  model: string;
  stage: string;
  projectId?: string;
  scriptId?: string;
}

export async function recordLlmRun(
  ctx: LlmRunContext,
  status: LlmRunStatus,
  durationMs: number,
  usage?: LlmTokenUsage,
  error?: string,
): Promise<void> {
  try {
    await prisma.llmRun.create({
      data: {
        provider: ctx.provider,
        model: ctx.model,
        stage: ctx.stage,
        projectId: ctx.projectId,
        scriptId: ctx.scriptId,
        inputTokens: usage?.inputTokens,
        outputTokens: usage?.outputTokens,
        totalTokens: usage?.totalTokens,
        durationMs,
        status,
        error: error?.slice(0, 500),
      },
    });
  } catch {
    // Usage logging must never break the pipeline.
  }
}
