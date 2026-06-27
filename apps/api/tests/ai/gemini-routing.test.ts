import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

const mockFetch = vi.fn();

vi.mock('../../src/config/features.js', () => ({
  isFeatureEnabled: vi.fn().mockResolvedValue(true),
}));

const schema = z.object({ ok: z.boolean() });

function geminiResponse(content: string) {
  return {
    ok: true,
    json: async () => ({
      candidates: [{ content: { parts: [{ text: content }] } }],
      usageMetadata: { promptTokenCount: 1, candidatesTokenCount: 1, totalTokenCount: 2 },
    }),
  };
}

describe('Gemini provider routing', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    vi.stubGlobal('fetch', mockFetch);
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.LLM_PROVIDER_EXTRACTOR;
  });

  it('routes the extractor role to Gemini when LLM_PROVIDER_EXTRACTOR=GEMINI', async () => {
    process.env.LLM_PROVIDER_EXTRACTOR = 'GEMINI';

    const { chatJson, resetLlmProviderForTests } = await import('../../src/ai/llm/index.js');
    resetLlmProviderForTests();

    mockFetch.mockResolvedValueOnce(geminiResponse(JSON.stringify({ ok: true })));

    const out = await chatJson({
      role: 'extractor',
      stage: 'scene_extraction',
      schema,
      schemaName: 'Test',
      systemPrompt: 's',
      userPrompt: 'u',
    });

    expect(out.provider).toBe('GEMINI');
    expect(out.data.ok).toBe(true);
    expect(String(mockFetch.mock.calls[0]![0])).toContain(':generateContent');
  });

  it('keeps the planner role on NVIDIA (default provider)', async () => {
    process.env.LLM_PROVIDER_EXTRACTOR = 'GEMINI';

    const { chatJson, resetLlmProviderForTests } = await import('../../src/ai/llm/index.js');
    resetLlmProviderForTests();

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: JSON.stringify({ ok: true }) } }],
        usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
      }),
    });

    const out = await chatJson({
      role: 'planner',
      stage: 'shooting_plan',
      schema,
      schemaName: 'Test',
      systemPrompt: 's',
      userPrompt: 'u',
    });

    expect(out.provider).toBe('NVIDIA');
  });
});
