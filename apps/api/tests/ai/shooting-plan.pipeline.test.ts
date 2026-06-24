import { beforeEach, describe, expect, it, vi } from 'vitest';

const chatJson = vi.fn();
const prismaMock = {
  script: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  shootingPlan: {
    deleteMany: vi.fn(),
    create: vi.fn(),
  },
  taskSuggestion: {
    deleteMany: vi.fn(),
    createMany: vi.fn(),
  },
  $transaction: vi.fn(),
};

vi.mock('../../src/lib/prisma.js', () => ({ prisma: prismaMock }));
vi.mock('../../src/config/env.js', () => ({
  env: { LLM_MAX_SCRIPT_CHARS: 250000, LLM_MAX_CHUNK_CHARS: 18000 },
}));
vi.mock('../../src/ai/llm/index.js', () => ({ chatJson }));
vi.mock('../../src/ai/pdf.js', () => ({
  extractPdfText: vi.fn(),
}));

const SCENE_BREAKDOWN = {
  scenes: [
    {
      sceneNumber: '1',
      slugline: 'INT. HOUSE - DAY',
      synopsis: 'Intro',
      locationType: 'INTERIOR',
      timeOfDay: 'DAY',
      locationName: 'House',
      estimatedPages: 1,
      charactersPresent: ['Raj'],
      hasStunts: false,
      hasVFX: false,
      hasSong: false,
    },
  ],
};

const TASK_SUGGESTIONS = {
  suggestions: [
    {
      title: 'Scout house location',
      description: null,
      departmentKind: 'LOCATION',
      priority: 'HIGH',
      sceneNumbers: ['1'],
      characterNames: ['Raj'],
      estimatedDueOffsetDays: 10,
    },
  ],
};

const SHOOTING_PLAN = {
  summary: 'One-day interior plan',
  totalShootDays: 1,
  risks: ['Tight interior lighting'],
  days: [
    {
      dayNumber: 1,
      title: 'House interiors',
      sceneNumbers: ['1'],
      location: 'House set',
      notes: null,
      estimatedHours: 8,
    },
  ],
  optimizationNotes: [],
};

describe('runShootingPlanPipeline', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.script.findUnique.mockResolvedValue({
      id: 'script-1',
      projectId: 'proj-1',
      rawText: 'INT. HOUSE - DAY\nRaj enters.',
      storageKey: 'scripts/proj/script.pdf',
      project: { id: 'proj-1', genre: 'Drama' },
    });
    prismaMock.$transaction.mockImplementation(async (fn: (tx: typeof prismaMock) => unknown) =>
      fn(prismaMock),
    );
    prismaMock.shootingPlan.create.mockResolvedValue({ id: 'plan-1' });
    chatJson
      .mockResolvedValueOnce(SCENE_BREAKDOWN)
      .mockResolvedValueOnce(TASK_SUGGESTIONS)
      .mockResolvedValueOnce(SHOOTING_PLAN);
  });

  it('stores shooting plan and pending task suggestions', async () => {
    const { runShootingPlanPipeline } =
      await import('../../src/ai/pipelines/shooting-plan.pipeline.js');
    const result = await runShootingPlanPipeline('script-1');

    expect(chatJson).toHaveBeenCalledTimes(3);
    expect(prismaMock.taskSuggestion.createMany).toHaveBeenCalled();
    expect(result.shootingPlanId).toBe('plan-1');
    expect(result.suggestionCount).toBe(1);
  });
});
