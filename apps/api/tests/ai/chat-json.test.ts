// chatJson is the contract between our prompts + OpenAI. We mock the
// underlying SDK and assert:
//   1. Valid JSON + schema → returns parsed object.
//   2. Invalid JSON → throws.
//   3. Schema mismatch (wrong field types) → throws.
//   4. The user/system prompts are passed verbatim.
//
// These guards mean a future OpenAI SDK upgrade can't silently turn
// JSON validation off.

import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { z } from 'zod';

const mockCreate = vi.fn();

vi.mock('openai', () => {
  // OpenAI's default export is the class. Constructor receives config.
  return {
    default: class MockOpenAI {
      chat = {
        completions: {
          create: mockCreate,
        },
      };
      constructor(_cfg: unknown) {
        // We don't care about config in tests.
      }
    },
  };
});

// Import AFTER the mock so the singleton picks up the mocked SDK.
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
      schema,
      schemaName: 'Test',
      systemPrompt: 'system',
      userPrompt: 'user',
    });
    expect(out.characters).toHaveLength(1);
    expect(out.characters[0]!.name).toBe('Rajesh');
  });

  it('throws when the model returns invalid JSON after repair', async () => {
    (mockCreate as Mock)
      .mockResolvedValueOnce({ choices: [{ message: { content: '{not json' } }] })
      .mockResolvedValueOnce({ choices: [{ message: { content: '{still bad' } }] });
    await expect(
      chatJson({ role: 'planner', schema, schemaName: 'Test', systemPrompt: 's', userPrompt: 'u' }),
    ).rejects.toThrow(/JSON/);
    expect(mockCreate).toHaveBeenCalledTimes(2);
  });

  it('throws when the JSON does not match the schema after repair', async () => {
    respond({ characters: [{ name: 'Rajesh', importance: 'BOSS' /* invalid */ }] });
    respond({ characters: [{ name: 'Rajesh', importance: 'BOSS' /* still invalid */ }] });
    await expect(
      chatJson({ role: 'planner', schema, schemaName: 'Test', systemPrompt: 's', userPrompt: 'u' }),
    ).rejects.toThrow(/schema/);
    expect(mockCreate).toHaveBeenCalledTimes(2);
  });

  it('passes the prompts to OpenAI verbatim', async () => {
    respond({ characters: [] });
    await chatJson({
      role: 'planner',
      schema,
      schemaName: 'Test',
      systemPrompt: 'SYSTEM-SENTINEL',
      userPrompt: 'USER-SENTINEL',
    });
    const callArg = (mockCreate as Mock).mock.calls.at(-1)?.[0];
    expect(callArg?.messages).toEqual([
      { role: 'system', content: 'SYSTEM-SENTINEL' },
      { role: 'user', content: 'USER-SENTINEL' },
    ]);
    expect(callArg?.response_format?.type).toBe('json_schema');
  });
});
