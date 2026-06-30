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

export class GeminiLlmProvider implements LlmChatProvider, LlmProviderClient {
  readonly name = 'GEMINI' as const;

  chatJson<T>(opts: ChatJsonOptions<T>): Promise<ChatJsonResult<T>> {
    return runJsonChat(this, opts);
  }

  modelForRole(role: LlmRole): string {
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

  repairModelForRole(_role: LlmRole, primaryModel: string): string {
    return env.GEMINI_MODEL_FAST ?? primaryModel;
  }

  async generate(req: ProviderGenerateRequest): Promise<ProviderRawResult> {
    const isRepair = req.repairSnippet !== undefined;
    const systemText = isRepair
      ? `${req.systemPrompt}\n\n${JSON_REPAIR_SYSTEM_PROMPT}\n\nReturn valid JSON only for schema "${req.schemaName}".`
      : `${req.systemPrompt}\n\nRespond with valid JSON only for schema "${req.schemaName}".`;

    const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [
      { role: 'user', parts: [{ text: req.userPrompt }] },
    ];
    if (isRepair) {
      contents.push({
        role: 'user',
        parts: [{ text: buildJsonRepairUserPrompt(req.schemaName, req.repairSnippet!) }],
      });
    }

    const body = {
      systemInstruction: { parts: [{ text: systemText }] },
      contents,
      generationConfig: {
        temperature: req.temperature,
        responseMimeType: 'application/json',
        ...(!isRepair && req.maxTokens ? { maxOutputTokens: req.maxTokens } : {}),
      },
    };

    const payload = await this.geminiFetch(req.model, body, req.stage);
    return { raw: extractText(payload), usage: parseUsage(payload) };
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
