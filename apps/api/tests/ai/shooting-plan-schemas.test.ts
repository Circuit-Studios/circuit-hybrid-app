import { describe, expect, it } from 'vitest';
import { sceneBreakdownResponseSchema } from '../../src/ai/schemas/scene-breakdown.schema.js';
import { taskSuggestionsResponseSchema } from '../../src/ai/schemas/task-suggestions.schema.js';
import { shootingPlanResponseSchema } from '../../src/ai/schemas/shooting-plan.schema.js';

describe('shooting plan schemas', () => {
  it('validates scene breakdown payload', () => {
    const parsed = sceneBreakdownResponseSchema.parse({
      scenes: [
        {
          sceneNumber: '1',
          slugline: 'INT. HOUSE - DAY',
          synopsis: 'Intro',
          locationType: 'INTERIOR',
          timeOfDay: 'DAY',
          locationName: 'House',
          estimatedPages: 1.5,
          charactersPresent: ['Raj'],
          hasStunts: false,
          hasVFX: false,
          hasSong: false,
        },
      ],
    });
    expect(parsed.scenes).toHaveLength(1);
  });

  it('validates task suggestions payload', () => {
    const parsed = taskSuggestionsResponseSchema.parse({
      suggestions: [
        {
          title: 'Scout street location',
          description: null,
          departmentKind: 'LOCATION',
          priority: 'HIGH',
          sceneNumbers: ['2'],
          characterNames: [],
          estimatedDueOffsetDays: 14,
        },
      ],
    });
    expect(parsed.suggestions[0]!.title).toContain('Scout');
  });

  it('validates shooting plan payload', () => {
    const parsed = shootingPlanResponseSchema.parse({
      summary: '12-day schedule focused on combination scenes.',
      totalShootDays: 12,
      risks: ['Monsoon overlap on EXT nights'],
      days: [
        {
          dayNumber: 1,
          title: 'Apartment block',
          sceneNumbers: ['1'],
          location: 'Studio apartment set',
          notes: null,
          estimatedHours: 10,
        },
      ],
      optimizationNotes: ['Batch night exteriors'],
    });
    expect(parsed.totalShootDays).toBe(12);
  });
});
