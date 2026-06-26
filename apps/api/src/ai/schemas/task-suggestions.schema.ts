import { z } from 'zod';
import { departmentKindSchema } from '../schemas.js';

export const taskSuggestionItemSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).nullable(),
  departmentKind: departmentKindSchema,
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
  sceneNumbers: z.array(z.string().min(1).max(16)).max(40).default([]),
  characterNames: z.array(z.string().min(1).max(120)).max(20).default([]),
  estimatedDueOffsetDays: z.number().int().min(0).max(365).nullable(),
});

export const taskSuggestionsResponseSchema = z.object({
  suggestions: z.array(taskSuggestionItemSchema).max(120),
});

export type TaskSuggestionItem = z.infer<typeof taskSuggestionItemSchema>;
export type TaskSuggestionsResponse = z.infer<typeof taskSuggestionsResponseSchema>;
