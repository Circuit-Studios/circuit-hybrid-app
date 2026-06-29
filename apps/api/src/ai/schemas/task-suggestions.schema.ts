import { z } from 'zod';
import { departmentKindSchema } from '../schemas.js';
import {
  tolerantNullableText,
  tolerantNumber,
  tolerantObjectArray,
  tolerantString,
  tolerantStringList,
} from './coerce.js';

export const taskSuggestionItemSchema = z.object({
  title: tolerantString(200),
  description: tolerantNullableText(1000),
  department: tolerantString(80),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).catch('MEDIUM'),
  sceneNumbers: tolerantStringList(40, 16),
  rationale: tolerantString(1000),
  confidence: tolerantNumber(0, 1, 0.5),
  suggestedDueOffsetDays: z.preprocess((value) => {
    if (value == null) return null;
    const n = Math.round(Number(value));
    return Number.isFinite(n) ? Math.min(365, Math.max(0, n)) : null;
  }, z.number().int().nullable()),
});

/** Accepts legacy `departmentKind` from older prompts during transition. */
export const taskSuggestionItemSchemaWithLegacy = taskSuggestionItemSchema.or(
  z.object({
    title: z.string().min(1).max(200),
    description: z.string().max(1000).nullable(),
    departmentKind: departmentKindSchema,
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
    sceneNumbers: z.array(z.string().min(1).max(16)).max(40).default([]),
    rationale: z.string().min(1).max(1000).optional(),
    confidence: z.number().min(0).max(1).optional(),
    estimatedDueOffsetDays: z.number().int().min(0).max(365).nullable().optional(),
  }),
);

/**
 * Models occasionally wrap the array under the schema name (e.g.
 * `{ "TaskSuggestions": [...] }`) or another single key instead of the expected
 * `suggestions`. Normalise those shapes (and a bare top-level array) before
 * validation so a correct payload under the wrong key isn't silently dropped.
 */
function unwrapSuggestions(value: unknown): unknown {
  if (Array.isArray(value)) return { suggestions: value };
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    if (Array.isArray(obj.suggestions)) return value;
    const arrayValues = Object.values(obj).filter(Array.isArray);
    if (arrayValues.length === 1) return { suggestions: arrayValues[0] };
  }
  return value;
}

export const taskSuggestionsResponseSchema = z.preprocess(
  unwrapSuggestions,
  z.object({
    suggestions: tolerantObjectArray(taskSuggestionItemSchema, 120),
  }),
);

export type TaskSuggestionItem = z.infer<typeof taskSuggestionItemSchema>;
export type TaskSuggestionsResponse = z.infer<typeof taskSuggestionsResponseSchema>;
