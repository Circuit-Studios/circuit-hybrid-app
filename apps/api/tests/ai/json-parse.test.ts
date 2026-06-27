import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { LlmJsonParseError } from '../../src/ai/llm/errors.js';
import { parseAndValidate, repairSnippetFromError } from '../../src/ai/llm/json-parse.js';

describe('LlmJsonParseError', () => {
  it('carries truncated raw output for repair without exposing it in the message', async () => {
    const raw = '{not json';
    await expect(
      parseAndValidate(raw, z.object({ ok: z.boolean() }), 'Test'),
    ).rejects.toMatchObject({
      message: 'AI response was not valid JSON',
      rawOutputSnippet: '{not json',
    });

    try {
      await parseAndValidate(raw, z.object({ ok: z.boolean() }), 'Test');
    } catch (err) {
      expect(err).toBeInstanceOf(LlmJsonParseError);
      expect(repairSnippetFromError(err)).toBe('{not json');
      expect((err as Error).message).not.toContain('not json');
    }
  });
});
