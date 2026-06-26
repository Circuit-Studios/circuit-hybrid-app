import type { AIScene } from '../schemas.js';

export function buildDepartmentsPrompt(
  scenes: AIScene[],
  projectGenre: string,
  projectLanguage: string,
): string {
  const flags = {
    hasStunts: scenes.some((s) => s.hasStunts),
    hasVFX: scenes.some((s) => s.hasVFX),
    hasSongs: scenes.some((s) => s.hasSong),
    hasExteriors: scenes.some((s) => s.locationType !== 'INTERIOR'),
    hasNight: scenes.some((s) => s.timeOfDay === 'NIGHT'),
  };

  return `Genre: ${projectGenre}
Language: ${projectLanguage}

SIGNALS DERIVED FROM SCENES:
- Stunts present: ${flags.hasStunts}
- VFX present: ${flags.hasVFX}
- Songs present: ${flags.hasSongs}
- Exterior scenes: ${flags.hasExteriors}
- Night scenes: ${flags.hasNight}
Total scenes: ${scenes.length}

TASK: Recommend which departments are REQUIRED for this production. Use the
provided DepartmentKind enum exactly. For each department:
- required = true if the script demands it; false if optional.
- reasoning = 1 sentence citing script evidence (eg "12 stunt scenes including
  the highway chase in scene 47"). Do NOT cite scenes that aren't in the list.

Always include DIRECTION and PRODUCTION as required. Include CASTING for any
project with named characters. Mark VFX/STUNTS as required only when the
signals above are true. Use POST_DI and POST_SOUND in the deliverables stage —
those are always required for theatrical release.`;
}
