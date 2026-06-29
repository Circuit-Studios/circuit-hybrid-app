import { z } from 'zod';
import {
  tolerantNullableText,
  tolerantNumber,
  tolerantString,
  tolerantStringList,
} from './coerce.js';

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
  sceneNumber: tolerantString(16),
  slugline: tolerantString(240),
  location: tolerantNullableText(160),
  interiorExterior: interiorExteriorSchema.catch('UNKNOWN'),
  timeOfDay: sceneTimeOfDaySchema.catch('UNKNOWN'),
  summary: tolerantNullableText(800),
  characters: tolerantStringList(40, 120),
  props: tolerantStringList(40, 120),
  vehicles: tolerantStringList(20, 120),
  animals: tolerantStringList(20, 120),
  stunts: tolerantStringList(10, 400),
  vfx: tolerantStringList(10, 400),
  sfx: tolerantStringList(10, 400),
  costumes: tolerantStringList(20, 200),
  makeup: tolerantStringList(20, 200),
  artDepartment: tolerantStringList(20, 200),
  cameraLightingNotes: tolerantStringList(10, 400),
  soundRisks: tolerantStringList(10, 400),
  productionRisks: tolerantStringList(10, 400),
  continuityNotes: tolerantStringList(10, 400),
  estimatedComplexity: estimatedComplexitySchema.catch('MEDIUM'),
  confidence: tolerantNumber(0, 1, 0.5),
});

export const sceneBreakdownResponseSchema = z.object({
  scenes: z.array(extractedSceneFactSchema).max(500),
});

/**
 * Normalise the various top-level shapes models emit into `{ scenes: [...] }`.
 * Some providers (e.g. Gemini in JSON mode) return a bare top-level array, and
 * others wrap the array under the schema name (e.g. `{ "SceneBreakdown": [...] }`)
 * instead of `scenes`. Without this, a perfectly good payload under the wrong
 * key/shape is silently rejected as a schema mismatch.
 */
function unwrapScenes(value: unknown): unknown {
  if (Array.isArray(value)) return { scenes: value };
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    if (Array.isArray(obj.scenes)) return value;
    const arrayValues = Object.values(obj).filter(Array.isArray);
    if (arrayValues.length === 1) return { scenes: arrayValues[0] };
  }
  return value;
}

/**
 * Loose envelope handed to the LLM client. We only assert that `scenes` is an
 * array here; each element is validated independently in the pipeline so a
 * single unparseable scene is skipped instead of failing the whole batch.
 */
export const sceneBreakdownEnvelopeSchema = z.preprocess(
  unwrapScenes,
  z.object({
    scenes: z.preprocess((v) => (Array.isArray(v) ? v : []), z.array(z.unknown()).max(500)),
  }),
);

/** Parse one raw scene; returns null (rather than throwing) when unusable. */
export function parseSceneFact(raw: unknown): ExtractedSceneFact | null {
  const result = extractedSceneFactSchema.safeParse(raw);
  if (!result.success) return null;
  const scene = result.data;
  // Drop junk rows where the model dropped both identifiers.
  if (!scene.sceneNumber && !scene.slugline) return null;
  return scene;
}

export type ExtractedSceneFact = z.output<typeof extractedSceneFactSchema>;
export type SceneBreakdownResponse = z.output<typeof sceneBreakdownResponseSchema>;
