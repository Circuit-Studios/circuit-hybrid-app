import { badRequest } from './http.js';

const PDF_MAGIC = '%PDF-';

/** Reject non-PDF uploads even when MIME type is spoofed. */
export function assertPdfMagicBytes(buffer: Buffer): void {
  if (buffer.length < PDF_MAGIC.length) {
    throw badRequest('Only PDF scripts are accepted');
  }
  const header = buffer.subarray(0, PDF_MAGIC.length).toString('utf8');
  if (header !== PDF_MAGIC) {
    throw badRequest('Only PDF scripts are accepted');
  }
}

/** Safe filename for Content-Disposition (no quotes, CR/LF, or path separators). */
export function sanitizeDownloadFilename(originalName: string): string {
  const base = originalName
    .replace(/[\r\n"]/g, '')
    .replace(/[/\\]/g, '_')
    .replace(/[^\w.\-() ]+/g, '_')
    .trim()
    .slice(0, 200);

  return base.length > 0 ? base : 'script.pdf';
}
