import type { AICharacter, AIScene } from '../schemas.js';

export function buildCombinationsPrompt(
  characters: AICharacter[],
  scenes: AIScene[],
  projectGenre: string,
): string {
  return `Genre: ${projectGenre}

CHARACTERS:
${characters.map((c) => `- ${c.name} (${c.importance})`).join('\n')}

SCENES (sceneNumber → characters):
${scenes
  .map(
    (s) =>
      `${s.sceneNumber}: [${s.charactersPresent.join(', ')}] ${s.locationType} ${s.timeOfDay}${s.hasSong ? ' SONG' : ''}${s.hasStunts ? ' STUNTS' : ''}`,
  )
  .join('\n')}

TASK: Identify high-value "combination scene" groups. A combination group is a
SET of scenes that share two or more SAME actors AND can plausibly be shot on
consecutive days at one location cluster. The goal: producers can call lead
actors only once for several scenes instead of multiple times.

For each group:
- groupLabel: short human title, eg "Nagarjuna + Prabhu Deva combo - studio set".
- characters: the shared actors (must be size >= 2 and all in the KNOWN list above).
- sceneNumbers: at least 2 scenes that all share those characters.
- estimatedDaysIfShotTogether: rough day count if grouped (e.g. 3.0 days).
- estimatedDaysIfShotSeparately: realistic worst case across separate call-ins.
- notes: 1-2 sentences explaining the optimisation rationale (location, mood, day/night).

Finally compute totalEstimatedSavingsDays as the sum of (separately - together)
across all groups. If no meaningful combinations exist, return an empty groups
array with totalEstimatedSavingsDays=0. Do not invent groups that don't share
actors.`;
}
