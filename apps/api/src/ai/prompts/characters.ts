export function buildCharactersPrompt(scriptText: string, projectGenre: string): string {
  return `Genre: ${projectGenre}

TASK: Extract every named character from the following script. Classify each
by importance:
  - LEAD: principal cast, appears across many scenes, drives the story.
  - SUPPORT: recurring named characters (sidekicks, antagonists, family).
  - DAY_ROLE: minor named or one-scene characters (a waiter named "Ravi").

Estimate screen time in minutes when reasonably inferable from page weight.
If a character is unnamed (e.g. "GUARD #2"), include them only if they have
dialogue across multiple scenes.

SCRIPT:
"""
${scriptText}
"""`;
}
