import { afterEach, describe, expect, it, vi } from 'vitest';

describe('getLlmProvider routing', () => {
  afterEach(() => {
    vi.resetModules();
  });

  it('selects NVIDIA provider when LLM_PROVIDER=NVIDIA', async () => {
    vi.doMock('../../src/config/env.js', () => ({
      env: { LLM_PROVIDER: 'NVIDIA' },
    }));
    vi.doMock('../../src/config/features.js', () => ({
      isFeatureEnabled: vi.fn().mockResolvedValue(true),
    }));

    const { getLlmProvider, resetLlmProviderForTests } = await import('../../src/ai/llm/index.js');
    resetLlmProviderForTests();
    const provider = await getLlmProvider();
    expect(provider.name).toBe('NVIDIA');
  });
});
