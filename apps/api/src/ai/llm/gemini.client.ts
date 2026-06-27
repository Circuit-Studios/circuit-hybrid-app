import { env } from '../../config/env.js';
import { logger } from '../../lib/logger.js';
import {
  JSON_REPAIR_SYSTEM_PROMPT,
  buildJsonRepairUserPrompt,
} from '../prompts/json-repair.prompt.js';
import { LlmError } from './errors.js';
import { parseAndValidate, repairSnippetFromError } from './json-parse.js';
import { recordLlmRun } from './usage.js';
import type { ChatJsonOptions, ChatJsonResult, LlmChatProvider, LlmTokenUsage } from './types.js';

function modelForRole(role: ChatJsonOptions<unknown>['role']): string {
  switch (role) {
    case 'extractor':
      return env.GEMINI_MODEL_EXTRACTOR!;
    case 'fast':
      return env.GEMINI_MODEL_FAST!;
    case 'fallback':
    case 'planner':
    default:
      return env.GEMINI_MODEL_PLANNER ?? env.GEMINI_MODEL_EXTRACTOR!;
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

interface GeminiGenerateResponse {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
  };
  error?: { message?: string; status?: string };
}

function parseUsage(payload: GeminiGenerateResponse): LlmTokenUsage | undefined {
  if (!payload.usageMetadata) return undefined;
  return {
    inputTokens: payload.usageMetadata.promptTokenCount,
    outputTokens: payload.usageMetadata.candidatesTokenCount,
    totalTokens: payload.usageMetadata.totalTokenCount,
  };
}

function extractText(payload: GeminiGenerateResponse): string | undefined {
  const parts = payload.candidates?.[0]?.content?.parts;
  if (!parts || parts.length === 0) return undefined;
  return parts
    .map((p) => p.text ?? '')
    .join('')
    .trim();
}

export class GeminiLlmProvider implements LlmChatProvider {
  readonly name = 'GEMINI' as const;

  async chatJson<T>(opts: ChatJsonOptions<T>): Promise<ChatJsonResult<T>> {
    const model = modelForRole(opts.role);
    const stage = opts.stage ?? opts.schemaName;
    const started = Date.now();

    logger.debug(
      { provider: 'GEMINI', model, stage, promptChars: opts.userPrompt.length },
      'llm.begin',
    );

    let lastErr: unknown;
    const maxAttempts = 1 + env.LLM_JSON_REPAIR_RETRIES;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const isRepair = attempt > 0;
        const repairModel = env.GEMINI_MODEL_FAST ?? model;
        const { data, usage } = isRepair
          ? await this.repairOnce(opts, repairModel, lastErr)
          : await this.requestOnce(opts, model);

        const durationMs = Date.now() - started;
        await recordLlmRun(
          {
            provider: 'GEMINI',
            model,
            stage: isRepair ? 'json_repair' : String(stage),
            projectId: opts.projectId,
            scriptId: opts.scriptId,
          },
          'SUCCEEDED',
          durationMs,
          usage,
        );
        return { data, provider: 'GEMINI', model, usage, durationMs };
      } catch (err) {
        lastErr = err;
        if (attempt >= maxAttempts - 1) {
          const message = err instanceof Error ? err.message : String(err);
          const durationMs = Date.now() - started;
          await recordLlmRun(
            {
              provider: 'GEMINI',
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
            : new LlmError(message, { provider: 'GEMINI', stage: String(stage), cause: err });
        }
      }
    }

    throw lastErr;
  }

  private async geminiFetch(
    model: string,
    body: Record<string, unknown>,
    stage: string,
  ): Promise<GeminiGenerateResponse> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), env.LLM_REQUEST_TIMEOUT_MS);

    try {
      const url = `${env.GEMINI_BASE_URL}/models/${encodeURIComponent(model)}:generateContent`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'x-goog-api-key': env.GEMINI_API_KEY ?? '',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      const payload = (await response.json()) as GeminiGenerateResponse;
      if (!response.ok) {
        throw new LlmError(payload.error?.message ?? `Gemini request failed (${response.status})`, {
          provider: 'GEMINI',
          statusCode: response.status,
          stage,
        });
      }
      return payload;
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        throw new LlmError(`Gemini request timed out after ${env.LLM_REQUEST_TIMEOUT_MS}ms`, {
          provider: 'GEMINI',
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
      systemInstruction: {
        parts: [
          {
            text: `${opts.systemPrompt}\n\nRespond with valid JSON only for schema "${opts.schemaName}".`,
          },
        ],
      },
      contents: [{ role: 'user', parts: [{ text: opts.userPrompt }] }],
      generationConfig: {
        temperature: temperatureForRole(opts.role, opts.temperature),
        responseMimeType: 'application/json',
        ...(opts.maxTokens ? { maxOutputTokens: opts.maxTokens } : {}),
      },
    };

    const payload = await this.geminiFetch(model, body, stage);
    const data = await parseAndValidate(extractText(payload), opts.schema, opts.schemaName);
    return { data, usage: parseUsage(payload) };
  }

  private async repairOnce<T>(
    opts: ChatJsonOptions<T>,
    model: string,
    firstErr: unknown,
  ): Promise<{ data: T; usage?: LlmTokenUsage }> {
    const invalidSnippet = repairSnippetFromError(firstErr);
    const body = {
      systemInstruction: { parts: [{ text: JSON_REPAIR_SYSTEM_PROMPT }] },
      contents: [
        {
          role: 'user',
          parts: [{ text: buildJsonRepairUserPrompt(opts.schemaName, invalidSnippet) }],
        },
      ],
      generationConfig: {
        temperature: 0,
        responseMimeType: 'application/json',
      },
    };

    const payload = await this.geminiFetch(model, body, 'json_repair');
    const data = await parseAndValidate(extractText(payload), opts.schema, opts.schemaName);
    return { data, usage: parseUsage(payload) };
  }
}
