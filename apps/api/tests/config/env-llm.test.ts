import { afterEach, describe, expect, it, vi } from 'vitest';

describe('LLM env validation', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.resetModules();
  });

  it('requires NVIDIA_API_KEY when LLM_PROVIDER=NVIDIA', async () => {
    process.env.LLM_PROVIDER = 'NVIDIA';
    process.env.NVIDIA_MODEL_PLANNER = 'nvidia/test';
    delete process.env.NVIDIA_API_KEY;
    process.env.OPENAI_API_KEY = 'sk-test';

    const exit = vi.spyOn(process, 'exit').mockImplementation((() => undefined) as never);
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    await import('../../src/config/env.js');

    expect(error).toHaveBeenCalled();
    expect(exit).toHaveBeenCalledWith(1);
  });

  it('defaults extractor to planner and fast to extractor for NVIDIA', async () => {
    process.env.LLM_PROVIDER = 'NVIDIA';
    process.env.NVIDIA_API_KEY = 'nvapi-test';
    process.env.NVIDIA_MODEL_PLANNER = 'nvidia/planner-model';
    process.env.NVIDIA_MODEL_EXTRACTOR = 'nvidia/extractor-model';
    delete process.env.NVIDIA_MODEL_FAST;
    process.env.OPENAI_API_KEY = 'sk-test';

    const { env } = await import('../../src/config/env.js');
    expect(env.NVIDIA_MODEL_EXTRACTOR).toBe('nvidia/extractor-model');
    expect(env.NVIDIA_MODEL_FAST).toBe('nvidia/extractor-model');
    expect(env.NVIDIA_MODEL_FALLBACK).toBe('nvidia/planner-model');
  });
});
