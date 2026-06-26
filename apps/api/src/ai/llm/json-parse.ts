import type { ZodSchema } from 'zod';
import { logger } from '../../lib/logger.js';

const REPAIR_SYSTEM =
  'You repair malformed JSON. Return only valid JSON matching the requested schema. No markdown fences.';

export function buildRepairUserPrompt(schemaName: string, invalidContent: string): string {
  return [
    `The previous response for schema "${schemaName}" was invalid.`,
    'Return corrected JSON only.',
    'Invalid content (truncated):',
    invalidContent.slice(0, 2000),
  ].join('\n');
}

export function parseAssistantJson(raw: string): unknown {
  const trimmed = raw.trim();
  const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)```$/i);
  const candidate = fenceMatch ? fenceMatch[1]!.trim() : trimmed;
  return JSON.parse(candidate);
}

export function validateWithSchema<T>(
  schema: ZodSchema<T>,
  parsed: unknown,
  schemaName: string,
): T {
  const result = schema.safeParse(parsed);
  if (!result.success) {
    logger.warn(
      { schemaName, issueCount: result.error.issues.length },
      'llm.schema_validation_failed',
    );
    throw new Error(`AI response did not match expected schema (${schemaName})`);
  }
  return result.data;
}

export async function parseAndValidate<T>(
  raw: string | null | undefined,
  schema: ZodSchema<T>,
  schemaName: string,
): Promise<T> {
  if (!raw?.trim()) {
    throw new Error('LLM returned an empty response');
  }

  let parsed: unknown;
  try {
    parsed = parseAssistantJson(raw);
  } catch {
    logger.warn({ schemaName }, 'llm.invalid_json');
    throw new Error('AI response was not valid JSON');
  }

  return validateWithSchema(schema, parsed, schemaName);
}
