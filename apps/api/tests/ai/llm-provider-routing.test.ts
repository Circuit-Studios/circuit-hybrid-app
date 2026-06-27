import { afterEach, describe, expect, it, vi } from 'vitest';

describe('getLlmProvider', () => {
  afterEach(() => {
    vi.resetModules();
  });

  it('returns the NVIDIA provider when the feature flag is enabled', async () => {
    vi.doMock('../../src/config/features.js', () => ({
      isFeatureEnabled: vi.fn().mockResolvedValue(true),
    }));

    const { getLlmProvider, resetLlmProviderForTests } = await import('../../src/ai/llm/index.js');
    resetLlmProviderForTests();
    const provider = await getLlmProvider();
    expect(provider.name).toBe('NVIDIA');
  });
});
