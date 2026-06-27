import { describe, expect, it } from 'vitest';
import { batchScenes, splitScenes } from '../../src/ai/script/scene-splitter.js';

const SAMPLE = `FADE IN:

INT. APARTMENT - DAY

RAJ enters.

EXT. STREET - NIGHT

Rain pours.

INT - CAR - DAWN

They drive.`;

describe('scene-splitter', () => {
  it('splits sluglines and batches scenes under a char budget', () => {
    const scenes = splitScenes(SAMPLE);
    expect(scenes.length).toBe(3);
    expect(scenes[0]!.slugline).toMatch(/^INT\./i);

    const batches = batchScenes(scenes, 80);
    expect(batches.length).toBeGreaterThan(1);
  });
});
