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
vi.mock('../../src/ai/pipelines/script-analysis-status.js', () => ({
  updateScriptAnalysisStatus: vi.fn(),
  failScriptAnalysis: vi.fn(),
  completeScriptPlanning: vi.fn(),
}));
vi.mock('../../src/notifications/notifications.service.js', () => ({
  dispatchNotification: vi.fn(),
}));

const SCENE_BREAKDOWN = {
  scenes: [
    {
      sceneNumber: '1',
      slugline: 'INT. HOUSE - DAY',
      location: 'House',
      interiorExterior: 'INT',
      timeOfDay: 'DAY',
      summary: 'Intro',
      characters: ['Raj'],
      props: [],
      vehicles: [],
      animals: [],
      stunts: [],
      vfx: [],
      sfx: [],
      costumes: [],
      makeup: [],
      artDepartment: [],
      cameraLightingNotes: [],
      soundRisks: [],
      productionRisks: [],
      continuityNotes: [],
      estimatedComplexity: 'LOW',
      confidence: 0.9,
    },
  ],
};

const TASK_SUGGESTIONS = {
  suggestions: [
    {
      title: 'Scout house location',
      description: null,
      department: 'LOCATION',
      priority: 'HIGH',
      sceneNumbers: ['1'],
      rationale: 'Interior house scenes need a practical location.',
      confidence: 0.85,
      suggestedDueOffsetDays: 10,
    },
  ],
};

const SHOOTING_PLAN = {
  summary: 'One-day interior plan',
  assumptions: ['No actor availability constraints provided'],
  shootDays: [
    {
      dayNumber: 1,
      location: 'House set',
      timeOfDay: 'DAY',
      sceneNumbers: ['1'],
      keyCast: ['Raj'],
      departmentsNeeded: ['LOCATION', 'ART'],
      estimatedComplexity: 'LOW',
      directorNotes: 'Batch interiors',
      risks: ['Tight interior lighting'],
      prepTasks: ['Scout location'],
    },
  ],
  riskSummary: 'Lighting setup may extend day one',
  recommendedNextSteps: ['Approve location scout task'],
};

function asChatJsonResult<T>(data: T) {
  return {
    data,
    provider: 'OPENAI' as const,
    model: 'gpt-4o',
    durationMs: 10,
  };
}

describe('runShootingPlanPipeline', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.script.findUnique.mockResolvedValue({
      id: 'script-1',
      projectId: 'proj-1',
      uploadedByUserId: 'user-1',
      rawText: 'INT. HOUSE - DAY\nRaj enters.',
      storageKey: 'scripts/proj/script.pdf',
      project: { id: 'proj-1', genre: 'Drama', ownerUserId: 'user-1' },
    });
    prismaMock.$transaction.mockImplementation(async (fn: (tx: typeof prismaMock) => unknown) =>
      fn(prismaMock),
    );
    prismaMock.shootingPlan.create.mockResolvedValue({ id: 'plan-1' });
    chatJson
      .mockResolvedValueOnce(asChatJsonResult(SCENE_BREAKDOWN))
      .mockResolvedValueOnce(asChatJsonResult(TASK_SUGGESTIONS))
      .mockResolvedValueOnce(asChatJsonResult(SHOOTING_PLAN));
  });

  it('stores shooting plan and pending task suggestions', async () => {
    const { runShootingPlanPipeline } =
      await import('../../src/ai/pipelines/shooting-plan.pipeline.js');
    const { updateScriptAnalysisStatus, completeScriptPlanning } =
      await import('../../src/ai/pipelines/script-analysis-status.js');
    const result = await runShootingPlanPipeline('script-1');

    expect(chatJson).toHaveBeenCalledTimes(3);
    expect(updateScriptAnalysisStatus).toHaveBeenCalled();
    expect(completeScriptPlanning).toHaveBeenCalled();
    expect(prismaMock.taskSuggestion.createMany).toHaveBeenCalled();
    const createManyArg = prismaMock.taskSuggestion.createMany.mock.calls[0]![0];
    expect(createManyArg.data[0]!.status).toBe('PENDING');
    expect(createManyArg.data[0]!.rationale).toContain('location');
    expect(result.shootingPlanId).toBe('plan-1');
    expect(result.suggestionCount).toBe(1);
  });
});
