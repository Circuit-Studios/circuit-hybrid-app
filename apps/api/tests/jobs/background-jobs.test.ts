import { beforeEach, describe, expect, it, vi } from 'vitest';

const isFeatureEnabled = vi.fn();
const analyzeScript = vi.fn();
const runShootingPlanPipeline = vi.fn();

vi.mock('../../src/config/features.js', () => ({ isFeatureEnabled }));
vi.mock('../../src/ai/pipelines/script-analysis.pipeline.js', () => ({ analyzeScript }));
vi.mock('../../src/ai/pipelines/shooting-plan.pipeline.js', () => ({ runShootingPlanPipeline }));

describe('runScriptAnalysisJob', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('prefers batched shooting-plan over legacy analyzeScript', async () => {
    isFeatureEnabled.mockResolvedValue(true);

    const { runScriptAnalysisJob } = await import('../../src/jobs/background-jobs.js');
    await runScriptAnalysisJob('script-1');

    expect(runShootingPlanPipeline).toHaveBeenCalledWith('script-1');
    expect(analyzeScript).not.toHaveBeenCalled();
  });

  it('falls back to legacy analyzeScript when shooting plan is disabled', async () => {
    isFeatureEnabled.mockImplementation(async (key: string) => key === 'scripts.aiAnalysis');

    const { runScriptAnalysisJob } = await import('../../src/jobs/background-jobs.js');
    await runScriptAnalysisJob('script-1');

    expect(analyzeScript).toHaveBeenCalledWith('script-1');
    expect(runShootingPlanPipeline).not.toHaveBeenCalled();
  });
});
