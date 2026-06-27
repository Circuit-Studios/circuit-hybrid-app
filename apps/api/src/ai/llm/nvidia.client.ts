import { env } from '../../config/env.js';
import { logger } from '../../lib/logger.js';
import {
  JSON_REPAIR_SYSTEM_PROMPT,
  buildJsonRepairUserPrompt,
} from '../prompts/json-repair.prompt.js';
import { LlmError } from './errors.js';
import { parseAndValidate } from './json-parse.js';
import { recordLlmRun } from './usage.js';
import type { ChatJsonOptions, ChatJsonResult, LlmChatProvider, LlmTokenUsage } from './types.js';

function modelForRole(role: ChatJsonOptions<unknown>['role']): string {
  switch (role) {
    case 'extractor':
      return env.NVIDIA_MODEL_EXTRACTOR!;
    case 'fast':
      return env.NVIDIA_MODEL_FAST!;
    case 'fallback':
      return env.NVIDIA_MODEL_FALLBACK ?? env.NVIDIA_MODEL_PLANNER!;
    case 'planner':
    default:
      return env.NVIDIA_MODEL_PLANNER!;
  }
}

function temperatureForRole(role: ChatJsonOptions<unknown>['role'], override?: number): number {
  if (override !== undefined) return override;
  switch (role) {
    case 'extractor':
      return env.LLM_EXTRACTOR_TEMPERATURE;
    case 'fast':
      return env.LLM_FAST_TEMPERATURE;
    case 'planner':
    case 'fallback':
    default:
      return env.LLM_PLANNER_TEMPERATURE;
  }
}

interface NvidiaCompletionResponse {
  choices?: Array<{ message?: { content?: string | null } }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
  error?: { message?: string };
}

function parseUsage(payload: NvidiaCompletionResponse): LlmTokenUsage | undefined {
  if (!payload.usage) return undefined;
  return {
    inputTokens: payload.usage.prompt_tokens,
    outputTokens: payload.usage.completion_tokens,
    totalTokens: payload.usage.total_tokens,
  };
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

    let lastErr: unknown;
    const maxAttempts = 1 + env.LLM_JSON_REPAIR_RETRIES;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const isRepair = attempt > 0;
        const { data, usage } = isRepair
          ? await this.repairOnce(opts, model, lastErr)
          : await this.requestOnce(opts, model);

        const durationMs = Date.now() - started;
        await recordLlmRun(
          {
            provider: 'NVIDIA',
            model,
            stage: isRepair ? 'json_repair' : String(stage),
            projectId: opts.projectId,
            scriptId: opts.scriptId,
          },
          'SUCCEEDED',
          durationMs,
          usage,
        );
        return { data, provider: 'NVIDIA', model, usage, durationMs };
      } catch (err) {
        lastErr = err;
        if (attempt >= maxAttempts - 1) {
          const message = err instanceof Error ? err.message : String(err);
          const durationMs = Date.now() - started;
          await recordLlmRun(
            {
              provider: 'NVIDIA',
              model,
              stage: String(stage),
              projectId: opts.projectId,
              scriptId: opts.scriptId,
            },
            'FAILED',
            durationMs,
            undefined,
            message,
          );
          throw err instanceof LlmError
            ? err
            : new LlmError(message, { provider: 'NVIDIA', stage: String(stage), cause: err });
        }
      }
    }

    throw lastErr;
  }

  private async nvidiaFetch(
    body: Record<string, unknown>,
    stage: string,
  ): Promise<NvidiaCompletionResponse> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), env.LLM_REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(`${env.NVIDIA_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.NVIDIA_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      const payload = (await response.json()) as NvidiaCompletionResponse;
      if (!response.ok) {
        throw new LlmError(payload.error?.message ?? `NVIDIA request failed (${response.status})`, {
          provider: 'NVIDIA',
          statusCode: response.status,
          stage,
        });
      }
      return payload;
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        throw new LlmError(`NVIDIA request timed out after ${env.LLM_REQUEST_TIMEOUT_MS}ms`, {
          provider: 'NVIDIA',
          stage,
          cause: err,
        });
      }
      throw err;
    } finally {
      clearTimeout(timeout);
    }
  }

  private async requestOnce<T>(
    opts: ChatJsonOptions<T>,
    model: string,
  ): Promise<{ data: T; usage?: LlmTokenUsage }> {
    const stage = String(opts.stage ?? opts.schemaName);
    const body = {
      model,
      temperature: temperatureForRole(opts.role, opts.temperature),
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

    const payload = await this.nvidiaFetch(body, stage);
    const raw = payload.choices?.[0]?.message?.content;
    const data = await parseAndValidate(raw, opts.schema, opts.schemaName);
    return { data, usage: parseUsage(payload) };
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
        { role: 'system', content: JSON_REPAIR_SYSTEM_PROMPT },
        { role: 'user', content: buildJsonRepairUserPrompt(opts.schemaName, invalidHint) },
      ],
      response_format: { type: 'json_object' },
    };

    const payload = await this.nvidiaFetch(body, 'json_repair');
    const raw = payload.choices?.[0]?.message?.content;
    const data = await parseAndValidate(raw, opts.schema, opts.schemaName);
    return { data, usage: parseUsage(payload) };
  }
}
