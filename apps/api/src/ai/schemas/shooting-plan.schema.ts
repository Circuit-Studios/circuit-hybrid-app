import { z } from 'zod';
import { estimatedComplexitySchema, sceneTimeOfDaySchema } from './scene-breakdown.schema.js';

export const shootingPlanDaySchema = z.object({
  dayNumber: z.number().int().min(1).max(300),
  location: z.string().max(200).nullable(),
  timeOfDay: sceneTimeOfDaySchema.nullable(),
  sceneNumbers: z.array(z.string().min(1).max(16)).max(80),
  keyCast: z.array(z.string().min(1).max(120)).max(40),
  departmentsNeeded: z.array(z.string().min(1).max(80)).max(30),
  estimatedComplexity: estimatedComplexitySchema,
  directorNotes: z.string().max(800).nullable(),
  risks: z.array(z.string().max(400)).max(15),
  prepTasks: z.array(z.string().max(400)).max(20),
});

export const shootingPlanResponseSchema = z.object({
  summary: z.string().min(1).max(3000),
  assumptions: z.array(z.string().max(500)).max(20),
  shootDays: z.array(shootingPlanDaySchema).max(300),
  riskSummary: z.string().max(2000),
  recommendedNextSteps: z.array(z.string().max(400)).max(15),
});

export type ShootingPlanDay = z.infer<typeof shootingPlanDaySchema>;
export type ShootingPlanResponse = z.infer<typeof shootingPlanResponseSchema>;
