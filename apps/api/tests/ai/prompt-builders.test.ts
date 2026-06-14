// Prompt builders are the most stable, fastest unit to test — they're pure
// string functions with no external dependencies. Tests here catch the
// silent-drift class of bugs: a renamed variable that breaks substitution,
// a missing character list, dropping the genre, etc.

import { describe, it, expect } from 'vitest';
import { buildCharactersPrompt } from '../../src/ai/prompts/characters.js';
import { buildScenesPrompt } from '../../src/ai/prompts/scenes.js';
import { buildCombinationsPrompt } from '../../src/ai/prompts/combinations.js';
import { buildDepartmentsPrompt } from '../../src/ai/prompts/departments.js';
import { buildShootDaysPrompt } from '../../src/ai/prompts/shoot-days.js';
import { buildBudgetPrompt } from '../../src/ai/prompts/budget.js';
import { cannedSummary } from './fixtures/canned-summary.js';

const SHORT_SCRIPT = `INT. CHENNAI CAFE - DAY
Rajesh and Anjali discuss the case.`;

describe('prompt builders', () => {
  it('characters prompt includes the script and the genre', () => {
    const p = buildCharactersPrompt(SHORT_SCRIPT, 'Courtroom Thriller');
    expect(p).toContain('Courtroom Thriller');
    expect(p).toContain('CHENNAI CAFE');
  });

  it('scenes prompt seeds known character names', () => {
    const p = buildScenesPrompt(SHORT_SCRIPT, ['Rajesh', 'Anjali']);
    expect(p).toContain('Rajesh');
    expect(p).toContain('Anjali');
  });

  it('combinations prompt receives every scene number', () => {
    const p = buildCombinationsPrompt(
      cannedSummary.characters.characters,
      cannedSummary.scenes.scenes,
      'Courtroom Thriller',
    );
    for (const s of cannedSummary.scenes.scenes) {
      expect(p).toContain(s.sceneNumber);
    }
  });

  it('departments prompt mentions the project language', () => {
    const p = buildDepartmentsPrompt(cannedSummary.scenes.scenes, 'Thriller', 'TELUGU');
    expect(p.toLowerCase()).toContain('telugu');
  });

  it('shoot-days prompt enumerates lead characters', () => {
    const p = buildShootDaysPrompt(
      cannedSummary.characters.characters,
      cannedSummary.scenes.scenes,
      cannedSummary.combinations.groups,
      'Thriller',
    );
    expect(p).toContain('Rajesh');
    expect(p).toContain('Anjali');
  });

  it('budget prompt references budget range when supplied', () => {
    const p = buildBudgetPrompt({
      projectGenre: 'Thriller',
      projectLanguage: 'TELUGU',
      budgetMinINR: 50_000_000,
      budgetMaxINR: 80_000_000,
      departments: cannedSummary.departments.departments,
      shootDays: cannedSummary.shootDays,
      combinations: cannedSummary.combinations.groups,
    });
    expect(p).toMatch(/crore/i);
    expect(p).toContain('5.00');
    expect(p).toContain('8.00');
  });
});
