import { describe, expect, it } from 'vitest';
import { assertPdfMagicBytes, sanitizeDownloadFilename } from '../../src/lib/pdf-upload.js';

describe('pdf-upload helpers', () => {
  it('accepts buffers starting with %PDF-', () => {
    expect(() => assertPdfMagicBytes(Buffer.from('%PDF-1.4\n%'))).not.toThrow();
  });

  it('rejects non-PDF buffers', () => {
    expect(() => assertPdfMagicBytes(Buffer.from('not-a-pdf'))).toThrow(
      /Only PDF scripts are accepted/,
    );
  });

  it('sanitizes download filenames', () => {
    expect(sanitizeDownloadFilename('my"script\r\n.pdf')).toBe('myscript.pdf');
    expect(sanitizeDownloadFilename('../../../etc/passwd')).toBe('.._.._.._etc_passwd');
  });
});
