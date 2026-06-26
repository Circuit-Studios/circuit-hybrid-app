import { env } from '../../config/env.js';
import { logger } from '../../lib/logger.js';
import { buildRepairUserPrompt, parseAndValidate } from './json-parse.js';
import { recordLlmRun } from './usage.js';
import type { ChatJsonOptions, ChatJsonResult, LlmChatProvider, LlmTokenUsage } from './types.js';

const REPAIR_SYSTEM =
  'You repair malformed JSON. Return only valid JSON matching the requested schema. No markdown fences.';

function modelForRole(role: ChatJsonOptions<unknown>['role']): string {
  switch (role) {
    case 'extractor':
      return env.NVIDIA_MODEL_EXTRACTOR!;
    case 'fast':
      return env.NVIDIA_MODEL_FAST!;
    case 'planner':
    default:
      return env.NVIDIA_MODEL_PLANNER!;
  }
}

interface NvidiaCompletionResponse {
  choices?: Array<{ message?: { content?: string | null } }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number };
  error?: { message?: string };
}

export class NvidiaLlmProvider implements LlmChatProvider {
  readonly name = 'NVIDIA' as const;

  async chatJson<T>(opts: ChatJsonOptions<T>): Promise<ChatJsonResult<T>> {
    const model = modelForRole(opts.role);
    const stage = opts.stage ?? opts.schemaName;
    const started = Date.now();

    logger.debug(
      { provider: 'NVIDIA', model, stage, promptChars: opts.userPrompt.length },
      'llm.begin',
    );

    try {
      const { data, usage } = await this.requestOnce(opts, model);
      await recordLlmRun(
        {
          provider: 'NVIDIA',
          model,
          stage,
          projectId: opts.projectId,
          scriptId: opts.scriptId,
        },
        'SUCCEEDED',
        Date.now() - started,
        usage,
      );
      return { data, usage };
    } catch (firstErr) {
      try {
        const { data, usage } = await this.repairOnce(opts, model, firstErr);
        await recordLlmRun(
          {
            provider: 'NVIDIA',
            model,
            stage,
            projectId: opts.projectId,
            scriptId: opts.scriptId,
          },
          'SUCCEEDED',
          Date.now() - started,
          usage,
        );
        return { data, usage };
      } catch (repairErr) {
        const message = repairErr instanceof Error ? repairErr.message : String(repairErr);
        await recordLlmRun(
          {
            provider: 'NVIDIA',
            model,
            stage,
            projectId: opts.projectId,
            scriptId: opts.scriptId,
          },
          'FAILED',
          Date.now() - started,
          undefined,
          message,
        );
        throw repairErr;
      }
    }
  }

  private async requestOnce<T>(
    opts: ChatJsonOptions<T>,
    model: string,
  ): Promise<{ data: T; usage?: LlmTokenUsage }> {
    const body = {
      model,
      temperature: opts.temperature ?? env.LLM_PLANNER_TEMPERATURE,
      max_tokens: opts.maxTokens,
      messages: [
        {
          role: 'system',
          content: `${opts.systemPrompt}\n\nRespond with valid JSON only for schema "${opts.schemaName}".`,
        },
        { role: 'user', content: opts.userPrompt },
      ],
      response_format: { type: 'json_object' },
    };

    const response = await fetch(`${env.NVIDIA_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.NVIDIA_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const payload = (await response.json()) as NvidiaCompletionResponse;
    if (!response.ok) {
      throw new Error(payload.error?.message ?? `NVIDIA request failed (${response.status})`);
    }

    const raw = payload.choices?.[0]?.message?.content;
    const data = await parseAndValidate(raw, opts.schema, opts.schemaName);
    const usage: LlmTokenUsage | undefined = payload.usage
      ? {
          inputTokens: payload.usage.prompt_tokens,
          outputTokens: payload.usage.completion_tokens,
        }
      : undefined;
    return { data, usage };
  }

  private async repairOnce<T>(
    opts: ChatJsonOptions<T>,
    model: string,
    firstErr: unknown,
  ): Promise<{ data: T; usage?: LlmTokenUsage }> {
    const invalidHint = firstErr instanceof Error ? firstErr.message : 'invalid';
    const body = {
      model,
      temperature: 0,
      messages: [
        { role: 'system', content: REPAIR_SYSTEM },
        { role: 'user', content: buildRepairUserPrompt(opts.schemaName, invalidHint) },
      ],
      response_format: { type: 'json_object' },
    };

    const response = await fetch(`${env.NVIDIA_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.NVIDIA_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const payload = (await response.json()) as NvidiaCompletionResponse;
    if (!response.ok) {
      throw new Error(payload.error?.message ?? `NVIDIA repair failed (${response.status})`);
    }

    const raw = payload.choices?.[0]?.message?.content;
    const data = await parseAndValidate(raw, opts.schema, opts.schemaName);
    const usage: LlmTokenUsage | undefined = payload.usage
      ? {
          inputTokens: payload.usage.prompt_tokens,
          outputTokens: payload.usage.completion_tokens,
        }
      : undefined;
    return { data, usage };
  }
}
