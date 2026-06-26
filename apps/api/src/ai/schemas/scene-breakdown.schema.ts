import { z } from 'zod';
import { departmentKindSchema, sceneLocationTypeSchema, sceneTimeOfDaySchema } from '../schemas.js';

export const extractedSceneFactSchema = z.object({
  sceneNumber: z.string().min(1).max(16),
  slugline: z.string().min(1).max(240),
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

export const sceneBreakdownResponseSchema = z.object({
  scenes: z.array(extractedSceneFactSchema).max(500),
});

export type ExtractedSceneFact = z.infer<typeof extractedSceneFactSchema>;
export type SceneBreakdownResponse = z.infer<typeof sceneBreakdownResponseSchema>;
