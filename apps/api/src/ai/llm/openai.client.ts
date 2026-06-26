import OpenAI from 'openai';
import { env } from '../../config/env.js';
import { logger } from '../../lib/logger.js';
import { zodToJsonSchema } from '../zod-to-json-schema.js';
import { buildRepairUserPrompt, parseAndValidate } from './json-parse.js';
import { recordLlmRun } from './usage.js';
import type { ChatJsonOptions, ChatJsonResult, LlmChatProvider } from './types.js';

const REPAIR_SYSTEM =
  'You repair malformed JSON. Return only valid JSON matching the requested schema. No markdown fences.';

function modelForRole(role: ChatJsonOptions<unknown>['role']): string {
  if (role === 'fast') return env.OPENAI_MODEL_FAST;
  return env.OPENAI_MODEL;
}

export class OpenAiLlmProvider implements LlmChatProvider {
  readonly name = 'OPENAI' as const;
  private readonly client: OpenAI;

  constructor() {
    this.client = new OpenAI({
      apiKey: env.OPENAI_API_KEY!,
      maxRetries: env.OPENAI_MAX_RETRIES,
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

    try {
      const data = await this.requestOnce(opts, model, jsonSchema);
      await recordLlmRun(
        {
          provider: 'OPENAI',
          model,
          stage,
          projectId: opts.projectId,
          scriptId: opts.scriptId,
        },
        'SUCCEEDED',
        Date.now() - started,
        undefined,
      );
      return { data };
    } catch (firstErr) {
      try {
        const data = await this.repairOnce(opts, model, firstErr);
        await recordLlmRun(
          {
            provider: 'OPENAI',
            model,
            stage,
            projectId: opts.projectId,
            scriptId: opts.scriptId,
          },
          'SUCCEEDED',
          Date.now() - started,
        );
        return { data };
      } catch (repairErr) {
        const message = repairErr instanceof Error ? repairErr.message : String(repairErr);
        await recordLlmRun(
          {
            provider: 'OPENAI',
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
    jsonSchema: Record<string, unknown>,
  ): Promise<T> {
    const completion = await this.client.chat.completions.create({
      model,
      temperature: opts.temperature ?? env.LLM_PLANNER_TEMPERATURE,
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
    return parseAndValidate(raw, opts.schema, opts.schemaName);
  }

  private async repairOnce<T>(
    opts: ChatJsonOptions<T>,
    model: string,
    firstErr: unknown,
  ): Promise<T> {
    const invalidHint = firstErr instanceof Error ? firstErr.message : 'invalid';
    const completion = await this.client.chat.completions.create({
      model,
      temperature: 0,
      messages: [
        { role: 'system', content: REPAIR_SYSTEM },
        { role: 'user', content: buildRepairUserPrompt(opts.schemaName, invalidHint) },
      ],
      response_format: { type: 'json_object' },
    });
    const raw = completion.choices[0]?.message?.content;
    return parseAndValidate(raw, opts.schema, opts.schemaName);
  }
}
