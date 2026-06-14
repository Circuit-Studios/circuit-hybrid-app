import type { AICharacter, AIScene, AICombinationGroup } from '../schemas.js';

export function buildShootDaysPrompt(
  characters: AICharacter[],
  scenes: AIScene[],
  combinations: AICombinationGroup[],
  projectGenre: string,
): string {
  const sceneCountByChar = new Map<string, number>();
  for (const scene of scenes) {
    for (const name of scene.charactersPresent) {
      sceneCountByChar.set(name, (sceneCountByChar.get(name) ?? 0) + 1);
    }
  }
  const lines = characters.map(c =>
    `- ${c.name} (${c.importance}) - appears in ${sceneCountByChar.get(c.name) ?? 0} scenes`,
  );

  return `Genre: ${projectGenre}
Total scenes: ${scenes.length}
Identified combination groups: ${combinations.length}

CHARACTER → SCENE COUNTS:
${lines.join('\n')}

COMBINATION GROUPS (already optimised):
${combinations
  .map(g => `- ${g.groupLabel}: chars=[${g.characters.join(', ')}] saves ${(g.estimatedDaysIfShotSeparately - g.estimatedDaysIfShotTogether).toFixed(1)} days`)
  .join('\n')}

TASK: Estimate shoot days per character (perActor[]), AFTER applying the
combination grouping above. Account for typical Indian-feature pace
(2-3 effective scenes per shoot day for leads, 4-6 for day roles).

Then estimate totalShootDaysEstimate for the whole project. This is NOT the
sum of per-actor days (most days have multiple actors). Use a realistic
production planner heuristic: typically 60-90 shoot days for a 100-150 page
script, less if heavy interior, more if many locations.

Provide 3-7 optimizationHints: short, concrete sentences a line producer can act on
(e.g. "Front-load all studio interiors in Weeks 1-2 while Nagarjuna is on call").`;
}
