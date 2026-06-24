import { z } from 'zod';

export const shootingPlanDaySchema = z.object({
  dayNumber: z.number().int().min(1).max(300),
  title: z.string().min(1).max(160),
  sceneNumbers: z.array(z.string().min(1).max(16)).max(80),
  location: z.string().max(200).nullable(),
  notes: z.string().max(800).nullable(),
  estimatedHours: z.number().min(0).max(24).nullable(),
});

export const shootingPlanResponseSchema = z.object({
  summary: z.string().min(1).max(3000),
  totalShootDays: z.number().int().min(1).max(300),
  risks: z.array(z.string().max(400)).max(30),
  days: z.array(shootingPlanDaySchema).max(300),
  optimizationNotes: z.array(z.string().max(400)).max(15).default([]),
});

export type ShootingPlanDay = z.infer<typeof shootingPlanDaySchema>;
export type ShootingPlanResponse = z.infer<typeof shootingPlanResponseSchema>;
