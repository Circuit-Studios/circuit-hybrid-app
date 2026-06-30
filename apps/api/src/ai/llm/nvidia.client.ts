import { env } from '../../config/env.js';
import {
  JSON_REPAIR_SYSTEM_PROMPT,
  buildJsonRepairUserPrompt,
} from '../prompts/json-repair.prompt.js';
import { LlmError } from './errors.js';
import {
  runJsonChat,
  type LlmProviderClient,
  type ProviderGenerateRequest,
  type ProviderRawResult,
} from './json-runner.js';
import type { ChatJsonOptions, ChatJsonResult, LlmChatProvider, LlmRole, LlmTokenUsage } from './types.js';

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

export class NvidiaLlmProvider implements LlmChatProvider, LlmProviderClient {
  readonly name = 'NVIDIA' as const;

  chatJson<T>(opts: ChatJsonOptions<T>): Promise<ChatJsonResult<T>> {
    return runJsonChat(this, opts);
  }

  modelForRole(role: LlmRole): string {
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

  repairModelForRole(): string {
    return env.NVIDIA_MODEL_FAST!;
  }

  async generate(req: ProviderGenerateRequest): Promise<ProviderRawResult> {
    const isRepair = req.repairSnippet !== undefined;
    const systemContent = isRepair
      ? `${req.systemPrompt}\n\n${JSON_REPAIR_SYSTEM_PROMPT}\n\nReturn valid JSON only for schema "${req.schemaName}". Do not include reasoning, <think> blocks, or markdown.`
      : `${req.systemPrompt}\n\nRespond with valid JSON only for schema "${req.schemaName}".`;

    const messages: Array<{ role: string; content: string }> = [
      { role: 'system', content: systemContent },
      { role: 'user', content: req.userPrompt },
    ];
    if (isRepair) {
      messages.push({
        role: 'user',
        content: buildJsonRepairUserPrompt(req.schemaName, req.repairSnippet!),
      });
    }

    const body = {
      model: req.model,
      temperature: req.temperature,
      // Repair resends full context and relies on the model's default ceiling.
      ...(isRepair ? {} : { max_tokens: req.maxTokens }),
      messages,
      response_format: { type: 'json_object' },
    };

    const payload = await this.nvidiaFetch(body, req.stage);
    return { raw: payload.choices?.[0]?.message?.content ?? undefined, usage: parseUsage(payload) };
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
          kind: 'timeout',
          cause: err,
        });
      }
      throw err;
    } finally {
      clearTimeout(timeout);
    }
  }
}
