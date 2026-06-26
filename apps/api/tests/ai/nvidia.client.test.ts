import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

const schema = z.object({ ok: z.boolean() });

describe('NvidiaLlmProvider', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
  });

  it('parses JSON and returns usage', async () => {
    vi.doMock('../../src/config/env.js', () => ({
      env: {
        NVIDIA_API_KEY: 'nvapi-test',
        NVIDIA_BASE_URL: 'https://integrate.api.nvidia.com/v1',
        NVIDIA_MODEL_PLANNER: 'nvidia/test-model',
        NVIDIA_MODEL_EXTRACTOR: 'nvidia/test-model',
        NVIDIA_MODEL_FAST: 'nvidia/test-model',
        LLM_PLANNER_TEMPERATURE: 0.2,
      },
    }));

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: JSON.stringify({ ok: true }) } }],
        usage: { prompt_tokens: 12, completion_tokens: 4 },
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const { NvidiaLlmProvider } = await import('../../src/ai/llm/nvidia.client.js');
    const provider = new NvidiaLlmProvider();
    const result = await provider.chatJson({
      role: 'planner',
      schema,
      schemaName: 'Test',
      systemPrompt: 'system',
      userPrompt: 'user',
      stage: 'test',
    });

    expect(result.data.ok).toBe(true);
    expect(result.usage?.inputTokens).toBe(12);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://integrate.api.nvidia.com/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer nvapi-test' }),
      }),
    );
  });

  it('retries once with repair prompt on invalid JSON', async () => {
    vi.doMock('../../src/config/env.js', () => ({
      env: {
        NVIDIA_API_KEY: 'nvapi-test',
        NVIDIA_BASE_URL: 'https://integrate.api.nvidia.com/v1',
        NVIDIA_MODEL_PLANNER: 'nvidia/test-model',
        NVIDIA_MODEL_EXTRACTOR: 'nvidia/test-model',
        NVIDIA_MODEL_FAST: 'nvidia/test-model',
        LLM_PLANNER_TEMPERATURE: 0.2,
      },
    }));

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ choices: [{ message: { content: '{bad json' } }] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ choices: [{ message: { content: JSON.stringify({ ok: true }) } }] }),
      });
    vi.stubGlobal('fetch', fetchMock);

    const { NvidiaLlmProvider } = await import('../../src/ai/llm/nvidia.client.js');
    const provider = new NvidiaLlmProvider();
    const result = await provider.chatJson({
      role: 'planner',
      schema,
      schemaName: 'Test',
      systemPrompt: 'system',
      userPrompt: 'user',
      stage: 'test',
    });

    expect(result.data.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
