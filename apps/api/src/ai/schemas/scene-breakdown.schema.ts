import { z } from 'zod';

export const interiorExteriorSchema = z.enum(['INT', 'EXT', 'INT_EXT', 'UNKNOWN']);
export const sceneTimeOfDaySchema = z.enum([
  'DAY',
  'NIGHT',
  'DAWN',
  'DUSK',
  'CONTINUOUS',
  'UNKNOWN',
]);
export const estimatedComplexitySchema = z.enum(['LOW', 'MEDIUM', 'HIGH']);

export const extractedSceneFactSchema = z.object({
  sceneNumber: z.string().min(1).max(16),
  slugline: z.string().min(1).max(240),
  location: z.string().max(160).nullable(),
  interiorExterior: interiorExteriorSchema,
  timeOfDay: sceneTimeOfDaySchema,
  summary: z.string().max(800).nullable(),
  characters: z.array(z.string().min(1).max(120)).max(40),
  props: z.array(z.string().min(1).max(120)).max(40),
  vehicles: z.array(z.string().min(1).max(120)).max(20),
  animals: z.array(z.string().min(1).max(120)).max(20),
  stunts: z.array(z.string().max(400)).max(10),
  vfx: z.array(z.string().max(400)).max(10),
  sfx: z.array(z.string().max(400)).max(10),
  costumes: z.array(z.string().max(200)).max(20),
  makeup: z.array(z.string().max(200)).max(20),
  artDepartment: z.array(z.string().max(200)).max(20),
  cameraLightingNotes: z.array(z.string().max(400)).max(10),
  soundRisks: z.array(z.string().max(400)).max(10),
  productionRisks: z.array(z.string().max(400)).max(10),
  continuityNotes: z.array(z.string().max(400)).max(10),
  estimatedComplexity: estimatedComplexitySchema,
  confidence: z.number().min(0).max(1),
});

export const sceneBreakdownResponseSchema = z.object({
  scenes: z.array(extractedSceneFactSchema).max(500),
});

export type ExtractedSceneFact = z.output<typeof extractedSceneFactSchema>;
export type SceneBreakdownResponse = z.output<typeof sceneBreakdownResponseSchema>;
