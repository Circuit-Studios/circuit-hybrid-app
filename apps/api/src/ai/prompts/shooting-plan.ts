import type { SplitScene } from '../script/scene-splitter.js';
import type { ExtractedSceneFact } from '../schemas/scene-breakdown.schema.js';

export const SHOOTING_PLAN_SYSTEM_PROMPT = `You are Circuit's director-grade production planner for Indian film shoots.
Extract structured facts from screenplay scenes. Be conservative with stunts/VFX/song flags.
Return JSON only.`;

export function buildSceneExtractionPrompt(scenes: SplitScene[], genre: string): string {
  const payload = scenes.map((s) => ({
    sceneNumber: s.sceneNumber,
    slugline: s.slugline,
    text: s.text.slice(0, 4000),
  }));

  return [
    `Genre: ${genre}`,
    'Extract structured facts for each scene below.',
    'Preserve sceneNumber and slugline. Infer characters from dialogue/cues.',
    JSON.stringify({ scenes: payload }),
  ].join('\n\n');
}

export function buildTaskSuggestionsPrompt(scenes: ExtractedSceneFact[], genre: string): string {
  return [
    `Genre: ${genre}`,
    'Generate actionable pre-production and shoot-prep task suggestions for a director.',
    'Tasks must be department-tagged and reference scene numbers when relevant.',
    'Do not create schedule rows — only suggested tasks awaiting approval.',
    JSON.stringify({ scenes }),
  ].join('\n\n');
}

export function buildShootingPlanPrompt(
  scenes: ExtractedSceneFact[],
  genre: string,
  taskCount: number,
): string {
  return [
    `Genre: ${genre}`,
    `There are ${taskCount} pending task suggestions derived from the script.`,
    'Produce a director-grade shooting plan: day-by-day grouping, risks, and optimization notes.',
    'Group scenes to minimise company moves and actor hold days.',
    JSON.stringify({ scenes }),
  ].join('\n\n');
}
