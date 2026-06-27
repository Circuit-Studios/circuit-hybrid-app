import { z } from 'zod';
import { departmentKindSchema } from '../schemas.js';

export const taskSuggestionItemSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).nullable(),
  department: z.string().min(1).max(80),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
  sceneNumbers: z.array(z.string().min(1).max(16)).max(40).default([]),
  rationale: z.string().min(1).max(1000),
  confidence: z.number().min(0).max(1),
  suggestedDueOffsetDays: z.number().int().min(0).max(365).nullable().optional(),
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

export const taskSuggestionsResponseSchema = z.object({
  suggestions: z.array(taskSuggestionItemSchema).max(120),
});

export type TaskSuggestionItem = z.infer<typeof taskSuggestionItemSchema>;
export type TaskSuggestionsResponse = z.infer<typeof taskSuggestionsResponseSchema>;
