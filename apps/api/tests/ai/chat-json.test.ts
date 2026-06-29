import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

const mockFetch = vi.fn();

vi.mock('../../src/config/features.js', () => ({
  isFeatureEnabled: vi.fn().mockResolvedValue(true),
}));

const { chatJson, resetLlmProviderForTests } = await import('../../src/ai/llm/index.js');

const schema = z.object({
  characters: z.array(z.object({ name: z.string(), importance: z.enum(['LEAD', 'SUPPORT']) })),
});

function nvidiaResponse(content: string) {
  return {
    ok: true,
    json: async () => ({
      choices: [{ message: { content } }],
      usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
    }),
  };
}

describe('chatJson', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    vi.stubGlobal('fetch', mockFetch);
    resetLlmProviderForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('parses and validates a well-formed NVIDIA response', async () => {
    mockFetch.mockResolvedValueOnce(
      nvidiaResponse(JSON.stringify({ characters: [{ name: 'Rajesh', importance: 'LEAD' }] })),
    );

    const out = await chatJson({
      role: 'planner',
      stage: 'json_repair',
      schema,
      schemaName: 'Test',
      systemPrompt: 'system',
      userPrompt: 'user',
    });

    expect(out.data.characters[0]!.name).toBe('Rajesh');
    expect(out.provider).toBe('NVIDIA');
  });

  it('throws when the model returns invalid JSON after one repair attempt', async () => {
    mockFetch
      .mockResolvedValueOnce(nvidiaResponse('{not json'))
      .mockResolvedValueOnce(nvidiaResponse('{still bad'));

    await expect(
      chatJson({
        role: 'planner',
        stage: 'json_repair',
        schema,
        schemaName: 'Test',
        systemPrompt: 's',
        userPrompt: 'u',
      }),
    ).rejects.toThrow(/JSON/);

    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});
