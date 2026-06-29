import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { LlmJsonParseError } from '../../src/ai/llm/errors.js';
import { parseAndValidate, repairSnippetFromError } from '../../src/ai/llm/json-parse.js';

describe('parseAndValidate', () => {
  it('throws LlmJsonParseError with a repair snippet that is not echoed in the message', async () => {
    const raw = '{not json';

    try {
      await parseAndValidate(raw, z.object({ ok: z.boolean() }), 'Test');
      expect.unreachable('parseAndValidate should reject invalid JSON');
    } catch (err) {
      expect(err).toBeInstanceOf(LlmJsonParseError);
      expect(err).toMatchObject({
        message: 'AI response was not valid JSON',
        rawOutputSnippet: raw,
      });
      expect(repairSnippetFromError(err)).toBe(raw);
      expect((err as Error).message).not.toContain('not json');
    }
  });
});
