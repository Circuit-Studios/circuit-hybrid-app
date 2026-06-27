import { describe, expect, it } from 'vitest';
import { sanitizeScriptText } from '../../src/ai/pdf.js';

describe('sanitizeScriptText', () => {
  it('removes null bytes that Postgres UTF-8 TEXT rejects', () => {
    const dirty = 'INT. HOUSE - DAY\0\nRAJ enters.\0';
    expect(sanitizeScriptText(dirty)).toBe('INT. HOUSE - DAY\nRAJ enters.');
    expect(sanitizeScriptText(dirty)).not.toContain('\0');
  });

  it('normalises line endings and excess blank lines', () => {
    expect(sanitizeScriptText('A\r\n\r\n\r\n\r\nB')).toBe('A\n\nB');
  });
});
