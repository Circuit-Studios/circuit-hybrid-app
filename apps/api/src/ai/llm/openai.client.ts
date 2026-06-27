import OpenAI from 'openai';
import { env } from '../../config/env.js';
import { logger } from '../../lib/logger.js';
import { zodToJsonSchema } from '../zod-to-json-schema.js';
import {
  JSON_REPAIR_SYSTEM_PROMPT,
  buildJsonRepairUserPrompt,
} from '../prompts/json-repair.prompt.js';
import { LlmError } from './errors.js';
import { parseAndValidate } from './json-parse.js';
import { recordLlmRun } from './usage.js';
import type { ChatJsonOptions, ChatJsonResult, LlmChatProvider, LlmTokenUsage } from './types.js';

function modelForRole(role: ChatJsonOptions<unknown>['role']): string {
  if (role === 'fast') return env.OPENAI_MODEL_FAST;
  return env.OPENAI_MODEL;
}

function temperatureForRole(role: ChatJsonOptions<unknown>['role'], override?: number): number {
  if (override !== undefined) return override;
  switch (role) {
    case 'extractor':
      return env.LLM_EXTRACTOR_TEMPERATURE;
    case 'fast':
      return env.LLM_FAST_TEMPERATURE;
    default:
      return env.LLM_PLANNER_TEMPERATURE;
  }
}

function parseOpenAiUsage(
  completion: OpenAI.Chat.Completions.ChatCompletion,
): LlmTokenUsage | undefined {
  if (!completion.usage) return undefined;
  return {
    inputTokens: completion.usage.prompt_tokens,
    outputTokens: completion.usage.completion_tokens,
    totalTokens: completion.usage.total_tokens,
  };
}

export class OpenAiLlmProvider implements LlmChatProvider {
  readonly name = 'OPENAI' as const;
  private readonly client: OpenAI;

  constructor() {
    this.client = new OpenAI({
      apiKey: env.OPENAI_API_KEY!,
      maxRetries: env.OPENAI_MAX_RETRIES,
      timeout: env.LLM_REQUEST_TIMEOUT_MS,
    });
  }

  async chatJson<T>(opts: ChatJsonOptions<T>): Promise<ChatJsonResult<T>> {
    const model = modelForRole(opts.role);
    const stage = opts.stage ?? opts.schemaName;
    const started = Date.now();
    const jsonSchema = zodToJsonSchema(opts.schema);

    logger.debug(
      { provider: 'OPENAI', model, stage, promptChars: opts.userPrompt.length },
      'llm.begin',
    );

    let lastErr: unknown;
    const maxAttempts = 1 + env.LLM_JSON_REPAIR_RETRIES;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const isRepair = attempt > 0;
        const result = isRepair
          ? await this.repairOnce(opts, model, lastErr)
          : await this.requestOnce(opts, model, jsonSchema);

        const durationMs = Date.now() - started;
        await recordLlmRun(
          {
            provider: 'OPENAI',
            model,
            stage: isRepair ? 'json_repair' : String(stage),
            projectId: opts.projectId,
            scriptId: opts.scriptId,
          },
          'SUCCEEDED',
          durationMs,
          result.usage,
        );
        return { data: result.data, provider: 'OPENAI', model, usage: result.usage, durationMs };
      } catch (err) {
        lastErr = err;
        if (attempt >= maxAttempts - 1) {
          const message = err instanceof Error ? err.message : String(err);
          const durationMs = Date.now() - started;
          await recordLlmRun(
            {
              provider: 'OPENAI',
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
            : new LlmError(message, { provider: 'OPENAI', stage: String(stage), cause: err });
        }
      }
    }

    throw lastErr;
  }

  private async requestOnce<T>(
    opts: ChatJsonOptions<T>,
    model: string,
    jsonSchema: Record<string, unknown>,
  ): Promise<{ data: T; usage?: LlmTokenUsage }> {
    const completion = await this.client.chat.completions.create({
      model,
      temperature: temperatureForRole(opts.role, opts.temperature),
      max_tokens: opts.maxTokens,
      messages: [
        { role: 'system', content: opts.systemPrompt },
        { role: 'user', content: opts.userPrompt },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: opts.schemaName,
          strict: true,
          schema: jsonSchema,
        },
      },
    });

    const raw = completion.choices[0]?.message?.content;
    const data = await parseAndValidate(raw, opts.schema, opts.schemaName);
    return { data, usage: parseOpenAiUsage(completion) };
  }

  private async repairOnce<T>(
    opts: ChatJsonOptions<T>,
    model: string,
    firstErr: unknown,
  ): Promise<{ data: T; usage?: LlmTokenUsage }> {
    const invalidHint = firstErr instanceof Error ? firstErr.message : 'invalid';
    const completion = await this.client.chat.completions.create({
      model,
      temperature: 0,
      messages: [
        { role: 'system', content: JSON_REPAIR_SYSTEM_PROMPT },
        { role: 'user', content: buildJsonRepairUserPrompt(opts.schemaName, invalidHint) },
      ],
      response_format: { type: 'json_object' },
    });
    const raw = completion.choices[0]?.message?.content;
    const data = await parseAndValidate(raw, opts.schema, opts.schemaName);
    return { data, usage: parseOpenAiUsage(completion) };
  }
}
