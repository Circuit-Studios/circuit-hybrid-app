import { afterEach, describe, expect, it, vi } from 'vitest';

describe('getLlmProvider', () => {
  afterEach(() => {
    vi.resetModules();
  });

  it('returns the NVIDIA provider by default (LLM_PROVIDER=NVIDIA)', async () => {
    const { getLlmProvider, resetLlmProviderForTests } = await import('../../src/ai/llm/index.js');
    resetLlmProviderForTests();
    const provider = getLlmProvider();
    expect(provider.name).toBe('NVIDIA');
  });
});
