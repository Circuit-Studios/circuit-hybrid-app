import type { ZodType, ZodTypeDef } from 'zod';
import { logger } from '../../lib/logger.js';
import {
  buildJsonRepairUserPrompt,
  JSON_REPAIR_SYSTEM_PROMPT,
} from '../prompts/json-repair.prompt.js';
import { LlmJsonParseError } from './errors.js';

export { JSON_REPAIR_SYSTEM_PROMPT, buildJsonRepairUserPrompt as buildRepairUserPrompt };
export { LlmJsonParseError } from './errors.js';

/** Strip reasoning-model wrappers (<think>…</think>) and any surrounding prose. */
function stripReasoning(text: string): string {
  return text
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/<\/?think>/gi, '')
    .trim();
}

/**
 * Extract the outermost balanced JSON object/array from a string that may be
 * surrounded by prose. Reasoning models (e.g. Nemotron Ultra) often emit text
 * before/after the JSON, which breaks a naive JSON.parse.
 */
function extractBalancedJson(text: string): string | null {
  const startObj = text.indexOf('{');
  const startArr = text.indexOf('[');
  const candidates = [startObj, startArr].filter((i) => i >= 0);
  if (candidates.length === 0) return null;
  const start = Math.min(...candidates);
  const open = text[start]!;
  const close = open === '{' ? '}' : ']';

  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i]!;
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === open) depth++;
    else if (ch === close) {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}

export function parseAssistantJson(raw: string): unknown {
  const cleaned = stripReasoning(raw);
  const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fenceMatch ? fenceMatch[1]! : cleaned).trim();

  try {
    return JSON.parse(candidate);
  } catch {
    // Reasoning prose or trailing text around the JSON — extract the object/array.
    const extracted = extractBalancedJson(candidate);
    if (extracted) return JSON.parse(extracted);
    throw new SyntaxError('No parseable JSON found in model output');
  }
}

export function validateWithSchema<T>(
  schema: ZodType<T, ZodTypeDef, any>,
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
  schema: ZodType<T, ZodTypeDef, any>,
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
