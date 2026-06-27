import type { ScriptSceneChunk } from '../script/scene-splitter.js';

export const SCENE_BREAKDOWN_SYSTEM_PROMPT = `You are Circuit's screenplay scene analyst for Indian film production.
Extract structured facts from screenplay scenes. Be conservative with stunt/VFX/SFX flags.
Return JSON only — no markdown, no prose outside JSON.

Each scene object must include:
sceneNumber, slugline, location, interiorExterior (INT|EXT|INT_EXT|UNKNOWN),
timeOfDay (DAY|NIGHT|DAWN|DUSK|CONTINUOUS|UNKNOWN), summary, characters,
props, vehicles, animals, stunts, vfx, sfx, costumes, makeup, artDepartment,
cameraLightingNotes, soundRisks, productionRisks, continuityNotes,
estimatedComplexity (LOW|MEDIUM|HIGH), confidence (0 to 1).`;

export function buildSceneBreakdownPrompt(scenes: ScriptSceneChunk[], genre: string): string {
  const payload = scenes.map((s) => ({
    sceneNumber: s.sceneNumber,
    slugline: s.slugline,
    text: s.text.slice(0, 4000),
  }));

  return [
    `Genre: ${genre}`,
    'Extract structured facts for each scene below.',
    'Preserve sceneNumber and slugline. Infer characters from dialogue/cues.',
    'Use empty arrays when a list field has no items. Use null for summary when unknown.',
    JSON.stringify({ scenes: payload }),
  ].join('\n\n');
}
