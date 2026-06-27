import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { z } from 'zod';

const mockCreate = vi.fn();

vi.mock('openai', () => ({
  default: class MockOpenAI {
    chat = { completions: { create: mockCreate } };
    constructor(_cfg: unknown) {}
  },
}));

const { chatJson } = await import('../../src/ai/openai.client.js');
const { resetLlmProviderForTests } = await import('../../src/ai/llm/index.js');

const schema = z.object({
  characters: z.array(z.object({ name: z.string(), importance: z.enum(['LEAD', 'SUPPORT']) })),
});

function respond(payload: unknown) {
  (mockCreate as Mock).mockResolvedValueOnce({
    choices: [{ message: { content: JSON.stringify(payload) } }],
  });
}

describe('chatJson', () => {
  beforeEach(() => {
    mockCreate.mockReset();
    resetLlmProviderForTests();
  });

  it('parses and validates a well-formed response', async () => {
    respond({ characters: [{ name: 'Rajesh', importance: 'LEAD' }] });
    const out = await chatJson({
      role: 'planner',
      stage: 'json_repair',
      schema,
      schemaName: 'Test',
      systemPrompt: 'system',
      userPrompt: 'user',
    });
    expect(out.data.characters[0]!.name).toBe('Rajesh');
  });

  it('throws when the model returns invalid JSON after repair', async () => {
    (mockCreate as Mock)
      .mockResolvedValueOnce({ choices: [{ message: { content: '{not json' } }] })
      .mockResolvedValueOnce({ choices: [{ message: { content: '{still bad' } }] });
    await expect(
      chatJson({ role: 'planner', stage: 'json_repair', schema, schemaName: 'Test', systemPrompt: 's', userPrompt: 'u' }),
    ).rejects.toThrow(/JSON/);
  });
});
