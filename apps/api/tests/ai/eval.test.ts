// End-to-end eval: takes the canned summary fixture (representative of a
// good AI run for our short-script) and asserts on:
//   - Schema validity (catches drift in schemas.ts)
//   - Headline counts (characters / scenes / shoot days)
//   - Department coverage (every required dept the script demands is present)
//   - Budget sanity (total within plausible range, line allocations sum)
//
// When you re-tune a prompt, replace the canned fixture with a fresh
// real-API run and re-run these tests. If they pass, the prompt change
// didn't regress on the headline numbers.

import { describe, it, expect } from 'vitest';
import { cannedSummary } from './fixtures/canned-summary.js';
import { aiScriptSummarySchema } from '../../src/ai/schemas.js';

describe('Script-analysis eval (canned-summary fixture)', () => {
  it('passes the strict aggregated schema', () => {
    const result = aiScriptSummarySchema.safeParse(cannedSummary);
    expect(result.success).toBe(true);
    if (!result.success) {
      console.error(result.error.issues);
    }
  });

  it('returns at least 5 characters with 2 leads', () => {
    const { characters } = cannedSummary.characters;
    expect(characters.length).toBeGreaterThanOrEqual(5);
    const leads = characters.filter((c) => c.importance === 'LEAD');
    expect(leads.length).toBeGreaterThanOrEqual(2);
  });

  it('returns at least 5 scenes including stunts/VFX/song coverage', () => {
    const { scenes } = cannedSummary.scenes;
    expect(scenes.length).toBeGreaterThanOrEqual(5);
    expect(scenes.some((s) => s.hasStunts)).toBe(true);
    expect(scenes.some((s) => s.hasVFX)).toBe(true);
    expect(scenes.some((s) => s.hasSong)).toBe(true);
  });

  it('every scene references a known character', () => {
    const names = new Set(cannedSummary.characters.characters.map((c) => c.name));
    for (const scene of cannedSummary.scenes.scenes) {
      for (const name of scene.charactersPresent) {
        expect(names.has(name)).toBe(true);
      }
    }
  });

  it('flags departments matching scene flags (STUNTS, VFX, MUSIC)', () => {
    const kinds = new Set(cannedSummary.departments.departments.map((d) => d.kind));
    expect(kinds.has('STUNTS')).toBe(true);
    expect(kinds.has('VFX')).toBe(true);
    expect(kinds.has('MUSIC')).toBe(true);
  });

  it('shoot-day estimate is reasonable for 5 scenes (≥5 ≤14 days)', () => {
    expect(cannedSummary.shootDays.totalShootDaysEstimate).toBeGreaterThanOrEqual(5);
    expect(cannedSummary.shootDays.totalShootDaysEstimate).toBeLessThanOrEqual(14);
  });

  it('per-actor estimates exist for every character', () => {
    const names = new Set(cannedSummary.characters.characters.map((c) => c.name));
    const estimateNames = new Set(cannedSummary.shootDays.perActor.map((a) => a.character));
    for (const n of names) {
      expect(estimateNames.has(n)).toBe(true);
    }
  });

  it('budget total equals the sum of all lines', () => {
    const sum = cannedSummary.budget.lines.reduce((s, l) => s + l.amountINR, 0);
    expect(sum).toBe(cannedSummary.budget.totalINR);
  });

  it('budget total falls inside a plausible mid-budget range (1-50 crore)', () => {
    expect(cannedSummary.budget.totalINR).toBeGreaterThanOrEqual(1_00_00_000); // 1 crore
    expect(cannedSummary.budget.totalINR).toBeLessThanOrEqual(50_00_00_000); // 50 crore
  });

  it('cast-fees line is the largest department spend', () => {
    const lines = cannedSummary.budget.lines;
    const cast = lines.find((l) => l.department === 'CASTING');
    expect(cast).toBeDefined();
    const otherLines = lines.filter((l) => l.department !== 'CASTING');
    for (const o of otherLines) {
      expect(cast!.amountINR).toBeGreaterThanOrEqual(o.amountINR);
    }
  });
});
