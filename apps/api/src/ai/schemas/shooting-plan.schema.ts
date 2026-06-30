import { z } from 'zod';
import { estimatedComplexitySchema, sceneTimeOfDaySchema } from './scene-breakdown.schema.js';
import {
  tolerantInt,
  tolerantNullableText,
  tolerantObjectArray,
  tolerantString,
  tolerantStringList,
} from './coerce.js';

export const shootingPlanDaySchema = z.object({
  dayNumber: tolerantInt(1, 300, 1),
  location: tolerantNullableText(200),
  timeOfDay: sceneTimeOfDaySchema.nullable().catch(null),
  sceneNumbers: tolerantStringList(80, 16),
  keyCast: tolerantStringList(40, 120),
  departmentsNeeded: tolerantStringList(30, 80),
  estimatedComplexity: estimatedComplexitySchema.catch('MEDIUM'),
  // Neutral factual summary of what the scenes contain — NOT directorial/how-to-shoot guidance.
  sceneSummary: tolerantNullableText(800),
  risks: tolerantStringList(15, 400),
  prepTasks: tolerantStringList(20, 400),
});

export const shootingPlanResponseSchema = z.object({
  summary: tolerantString(3000),
  assumptions: tolerantStringList(20, 500),
  shootDays: tolerantObjectArray(shootingPlanDaySchema, 300),
  riskSummary: tolerantString(2000),
  recommendedNextSteps: tolerantStringList(15, 400),
});

export type ShootingPlanDay = z.infer<typeof shootingPlanDaySchema>;
export type ShootingPlanResponse = z.infer<typeof shootingPlanResponseSchema>;
