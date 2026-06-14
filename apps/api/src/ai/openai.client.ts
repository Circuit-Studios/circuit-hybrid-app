import OpenAI from 'openai';
import { z, type ZodSchema } from 'zod';
import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';
import { zodToJsonSchema } from './zod-to-json-schema.js';

const client = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
  maxRetries: env.OPENAI_MAX_RETRIES,
});

export interface JsonChatOptions<T> {
  schema: ZodSchema<T>;
  schemaName: string;
  systemPrompt: string;
  userPrompt: string;
  // Use the fast model for low-stakes structural tasks (e.g. character list).
  fast?: boolean;
  temperature?: number;
}

// Calls GPT-4o with the response constrained to a JSON Schema derived from
// the supplied Zod schema. Returns the parsed, validated TypeScript object.
export async function chatJson<T>(opts: JsonChatOptions<T>): Promise<T> {
  const model = opts.fast ? env.OPENAI_MODEL_FAST : env.OPENAI_MODEL;
  const jsonSchema = zodToJsonSchema(opts.schema);

  logger.debug(
    { model, schema: opts.schemaName, promptChars: opts.userPrompt.length },
    'OpenAI chatJson begin',
  );

  const completion = await client.chat.completions.create({
    model,
    temperature: opts.temperature ?? 0.2,
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
  if (!raw) throw new Error('OpenAI returned an empty response');

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    logger.error({ raw }, 'OpenAI returned invalid JSON');
    throw new Error('AI response was not valid JSON');
  }

  const result = opts.schema.safeParse(parsed);
  if (!result.success) {
    logger.error({ issues: result.error.issues, raw: parsed }, 'AI response failed schema validation');
    throw new Error('AI response did not match expected schema');
  }
  return result.data;
}
