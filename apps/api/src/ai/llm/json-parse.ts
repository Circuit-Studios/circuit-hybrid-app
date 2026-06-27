import type { ZodSchema } from 'zod';
import { logger } from '../../lib/logger.js';
import {
  buildJsonRepairUserPrompt,
  JSON_REPAIR_SYSTEM_PROMPT,
} from '../prompts/json-repair.prompt.js';
import { LlmJsonParseError } from './errors.js';

export { JSON_REPAIR_SYSTEM_PROMPT, buildJsonRepairUserPrompt as buildRepairUserPrompt };
export { LlmJsonParseError } from './errors.js';

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
  rawOutput?: string | null,
): T {
  const result = schema.safeParse(parsed);
  if (!result.success) {
    logger.warn(
      { schemaName, issueCount: result.error.issues.length },
      'llm.schema_validation_failed',
    );
    throw new LlmJsonParseError({
      message: `AI response did not match expected schema (${schemaName})`,
      schemaName,
      kind: 'schema_mismatch',
      rawOutput,
    });
  }
  return result.data;
}

export async function parseAndValidate<T>(
  raw: string | null | undefined,
  schema: ZodSchema<T>,
  schemaName: string,
): Promise<T> {
  if (!raw?.trim()) {
    throw new LlmJsonParseError({
      message: 'LLM returned an empty response',
      schemaName,
      kind: 'empty',
      rawOutput: raw,
    });
  }

  let parsed: unknown;
  try {
    parsed = parseAssistantJson(raw);
  } catch {
    logger.warn({ schemaName }, 'llm.invalid_json');
    throw new LlmJsonParseError({
      message: 'AI response was not valid JSON',
      schemaName,
      kind: 'invalid_json',
      rawOutput: raw,
    });
  }

  return validateWithSchema(schema, parsed, schemaName, raw);
}

/** Snippet for JSON repair — prefers in-memory raw output, never logs it here. */
export function repairSnippetFromError(err: unknown): string {
  if (err instanceof LlmJsonParseError) {
    return err.rawOutputSnippet;
  }
  return err instanceof Error ? err.message : 'invalid';
}
