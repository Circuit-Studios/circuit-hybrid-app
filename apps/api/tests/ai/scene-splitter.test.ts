import { describe, expect, it } from 'vitest';
import { batchScenes, splitScenes } from '../../src/ai/script/scene-splitter.js';

const SAMPLE = `FADE IN:

INT. APARTMENT - DAY

RAJ enters.

EXT. STREET - NIGHT

Rain pours.

INT./EXT. CAR - DAWN

They drive.`;

describe('splitScenes', () => {
  it('detects INT/EXT sluglines', () => {
    const scenes = splitScenes(SAMPLE);
    expect(scenes.length).toBe(3);
    expect(scenes[0]!.slugline).toMatch(/^INT\./i);
    expect(scenes[1]!.slugline).toMatch(/^EXT\./i);
    expect(scenes[2]!.slugline).toMatch(/INT/i);
  });

  it('returns a single scene for unheaded text', () => {
    const scenes = splitScenes('Just dialogue without sluglines.');
    expect(scenes).toHaveLength(1);
    expect(scenes[0]!.sceneNumber).toBe('1');
  });
});

describe('batchScenes', () => {
  it('groups scenes under max char budget', () => {
    const scenes = splitScenes(SAMPLE);
    const batches = batchScenes(scenes, 80);
    expect(batches.length).toBeGreaterThan(1);
  });
});
