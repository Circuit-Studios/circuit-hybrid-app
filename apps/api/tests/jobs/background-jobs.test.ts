import { beforeEach, describe, expect, it, vi } from 'vitest';

const isFeatureEnabled = vi.fn();
const runShootingPlanPipeline = vi.fn();

vi.mock('../../src/config/features.js', () => ({ isFeatureEnabled }));
vi.mock('../../src/ai/pipelines/shooting-plan.pipeline.js', () => ({ runShootingPlanPipeline }));

describe('runScriptAnalysisJob', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('runs the shooting-plan pipeline when scripts.shootingPlan is enabled', async () => {
    isFeatureEnabled.mockResolvedValue(true);

    const { runScriptAnalysisJob } = await import('../../src/jobs/background-jobs.js');
    await runScriptAnalysisJob('script-1');

    expect(runShootingPlanPipeline).toHaveBeenCalledWith('script-1');
  });

  it('throws when scripts.shootingPlan is disabled', async () => {
    isFeatureEnabled.mockResolvedValue(false);

    const { runScriptAnalysisJob } = await import('../../src/jobs/background-jobs.js');
    await expect(runScriptAnalysisJob('script-1')).rejects.toThrow(
      /Shooting plan pipeline is disabled/,
    );
    expect(runShootingPlanPipeline).not.toHaveBeenCalled();
  });
});
