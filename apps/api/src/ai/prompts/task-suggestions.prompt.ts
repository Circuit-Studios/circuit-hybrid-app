import type { ExtractedSceneFact } from '../schemas/scene-breakdown.schema.js';

export const TASK_SUGGESTIONS_SYSTEM_PROMPT = `You are Circuit's production task planner for Indian film shoots.
Generate actionable pre-production and shoot-prep task suggestions for a director.
Return JSON only — no markdown, no prose outside JSON.
Do not create schedule rows or final tasks — only reviewable suggestions.

Return a single JSON object of the exact shape: {"suggestions": [ ... ]}.
The top-level key MUST be "suggestions" (an array). Do not rename it.

Each suggestion in the array must include:
title, description, department, priority (LOW|MEDIUM|HIGH|URGENT), sceneNumbers,
rationale, confidence (0 to 1), suggestedDueOffsetDays (optional integer).`;

export function buildTaskSuggestionsPrompt(scenes: ExtractedSceneFact[], genre: string): string {
  return [
    `Genre: ${genre}`,
    'Generate actionable pre-production and shoot-prep task suggestions for a director.',
    'Tasks must be department-tagged and reference scene numbers when relevant.',
    'Never pretend to know actor/location availability unless provided in the input.',
    JSON.stringify({ scenes }),
  ].join('\n\n');
}
