export function buildScenesPrompt(
  scriptText: string,
  knownCharacterNames: string[],
): string {
  return `KNOWN CHARACTERS (from previous extraction):
${knownCharacterNames.join(', ')}

TASK: Walk through the script linearly and emit one entry per scene in order.
Use the script's actual scene numbers when available; otherwise generate
"S1", "S2", ... in reading order.

For each scene:
- sceneNumber, heading (the slugline like "INT. KITCHEN - NIGHT"), synopsis (1-2 sentences).
- locationType from {INTERIOR, EXTERIOR, INT_EXT}.
- timeOfDay from {DAY, NIGHT, DAWN, DUSK, UNSPECIFIED}.
- locationName: the bare location ("Kitchen", "Beach Road"), null if unclear.
- estimatedPages: in 1/8 page increments (eg 1.25 = 1 and 2/8).
- charactersPresent: subset of the KNOWN CHARACTERS list above. Do NOT invent new names.
- hasStunts: true if the scene contains fights, chases, or physical risk.
- hasVFX: true if the scene requires CG, compositing, or significant post effects.
- hasSong: true if the scene is a song-and-dance number.

SCRIPT:
"""
${scriptText}
"""`;
}
