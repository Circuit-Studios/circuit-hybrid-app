import { z } from 'zod';

// Output schemas for each of the six AI sub-tasks in Module 2 of the spec.
// Keeping these as Zod gives us:
//   - Strict runtime validation of the model's JSON output.
//   - Easy generation of a JSON Schema we can hand to GPT-4o `response_format`.
//   - Inferred TypeScript types throughout the backend and shared with mobile.

// ---------- 1. Character extraction ----------
export const characterImportanceSchema = z.enum(['LEAD', 'SUPPORT', 'DAY_ROLE']);

export const aiCharacterSchema = z.object({
  name: z.string().min(1).max(120),
  importance: characterImportanceSchema,
  estimatedScreenTimeMinutes: z.number().min(0).max(240).nullable(),
  notes: z.string().max(500).nullable(),
});

export const aiCharactersResponseSchema = z.object({
  characters: z.array(aiCharacterSchema).max(80),
});

// ---------- 2. Scene analysis ----------
export const sceneLocationTypeSchema = z.enum(['INTERIOR', 'EXTERIOR', 'INT_EXT']);
export const sceneTimeOfDaySchema = z.enum(['DAY', 'NIGHT', 'DAWN', 'DUSK', 'UNSPECIFIED']);

export const aiSceneSchema = z.object({
  sceneNumber: z.string().min(1).max(16),
  heading: z.string().min(1).max(240),
  synopsis: z.string().max(800).nullable(),
  locationType: sceneLocationTypeSchema,
  timeOfDay: sceneTimeOfDaySchema,
  locationName: z.string().max(160).nullable(),
  estimatedPages: z.number().min(0).max(20).nullable(),
  charactersPresent: z.array(z.string().min(1).max(120)).max(40),
  hasStunts: z.boolean(),
  hasVFX: z.boolean(),
  hasSong: z.boolean(),
});

export const aiScenesResponseSchema = z.object({
  scenes: z.array(aiSceneSchema).max(500),
});

// ---------- 3. Combination scenes (optimisation matrix) ----------
export const aiCombinationGroupSchema = z.object({
  groupLabel: z.string().min(1).max(120),
  characters: z.array(z.string()).min(2).max(20),
  sceneNumbers: z.array(z.string()).min(2).max(80),
  estimatedDaysIfShotTogether: z.number().min(0.5).max(60),
  estimatedDaysIfShotSeparately: z.number().min(0.5).max(120),
  notes: z.string().max(400).nullable(),
});

export const aiCombinationsResponseSchema = z.object({
  groups: z.array(aiCombinationGroupSchema).max(20),
  totalEstimatedSavingsDays: z.number().min(0).max(200),
});

// ---------- 4. Department suggestions ----------
export const departmentKindSchema = z.enum([
  'DIRECTION',
  'PRODUCTION',
  'CASTING',
  'DOP_CAMERA',
  'ART',
  'COSTUME',
  'MAKEUP_HAIR',
  'STUNTS',
  'VFX',
  'SOUND',
  'MUSIC',
  'LOCATION',
  'EDITORIAL',
  'POST_DI',
  'POST_SOUND',
  'OTHER',
]);

export const aiDepartmentSchema = z.object({
  kind: departmentKindSchema,
  displayName: z.string().min(1).max(80),
  required: z.boolean(),
  reasoning: z.string().max(400),
});

export const aiDepartmentsResponseSchema = z.object({
  departments: z.array(aiDepartmentSchema).max(20),
});

// ---------- 5. Shoot day estimates per actor ----------
export const aiActorShootDaysSchema = z.object({
  character: z.string(),
  sceneCount: z.number().int().min(0),
  estimatedDays: z.number().min(0.5).max(120),
  notes: z.string().max(300).nullable(),
});

export const aiShootDaysResponseSchema = z.object({
  perActor: z.array(aiActorShootDaysSchema).max(80),
  totalShootDaysEstimate: z.number().min(1).max(200),
  optimizationHints: z.array(z.string().max(240)).max(10),
});

// ---------- 6. Budget draft ----------
export const aiBudgetLineSchema = z.object({
  department: departmentKindSchema,
  label: z.string().min(1).max(120),
  amountINR: z.number().min(0).max(5_000_000_000), // up to 500 crore
  notes: z.string().max(300).nullable(),
});

export const aiBudgetResponseSchema = z.object({
  lines: z.array(aiBudgetLineSchema).max(40),
  totalINR: z.number().min(0),
  confidence: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  caveats: z.array(z.string().max(240)).max(8),
});

// ---------- Aggregated final summary ----------
export const aiScriptSummarySchema = z.object({
  characters: aiCharactersResponseSchema,
  scenes: aiScenesResponseSchema,
  combinations: aiCombinationsResponseSchema,
  departments: aiDepartmentsResponseSchema,
  shootDays: aiShootDaysResponseSchema,
  budget: aiBudgetResponseSchema,
});

export type AICharacter = z.infer<typeof aiCharacterSchema>;
export type AIScene = z.infer<typeof aiSceneSchema>;
export type AICombinationGroup = z.infer<typeof aiCombinationGroupSchema>;
export type AIDepartment = z.infer<typeof aiDepartmentSchema>;
export type AIBudgetLine = z.infer<typeof aiBudgetLineSchema>;
export type AIScriptSummary = z.infer<typeof aiScriptSummarySchema>;
