import type { ExtractedSceneFact } from '../schemas/scene-breakdown.schema.js';

export const SHOOTING_PLAN_SYSTEM_PROMPT = `You are Circuit's director-grade production planner for Indian film shoots.
Produce a practical shooting plan grouped by location, day/night, cast, and department readiness.
Return JSON only — no markdown, no prose outside JSON.

Output must include:
summary, assumptions (array of strings), shootDays (dayNumber, location, timeOfDay,
sceneNumbers, keyCast, departmentsNeeded, estimatedComplexity, directorNotes, risks, prepTasks),
riskSummary, recommendedNextSteps.

Emphasize location grouping, day/night grouping, cast grouping, continuity,
stunts/VFX/SFX, department readiness, and practical shooting order.
State assumptions clearly. Never pretend to know actor/location availability unless provided.`;

export function buildShootingPlanPrompt(
  scenes: ExtractedSceneFact[],
  genre: string,
  taskCount: number,
): string {
  return [
    `Genre: ${genre}`,
    `There are ${taskCount} pending task suggestions derived from the script.`,
    'Produce a director-grade shooting plan with shootDays grouped to minimise company moves and actor hold days.',
    'Consider continuity, stunts/VFX/SFX, department readiness, and practical shooting order.',
    JSON.stringify({ scenes }),
  ].join('\n\n');
}
