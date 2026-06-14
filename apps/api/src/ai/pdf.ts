import pdfParse from 'pdf-parse';
import { getStorage } from '../storage/index.js';

export interface ExtractedScript {
  rawText: string;
  pageCount: number;
}

export async function extractPdfText(storageKey: string): Promise<ExtractedScript> {
  const obj = await getStorage().get(storageKey);

  // Drain the stream into a single buffer. pdf-parse needs the full byte
  // payload to count pages; for scripts capped at 25 MB this is fine.
  const chunks: Buffer[] = [];
  for await (const chunk of obj.stream as AsyncIterable<Buffer | Uint8Array>) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const buffer = Buffer.concat(chunks);

  const result = await pdfParse(buffer);
  return {
    rawText: normalise(result.text),
    pageCount: result.numpages,
  };
}

function normalise(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// Naive splitter so we can hand a large script to GPT-4o in chunks if needed.
// Tries to break on scene-heading-like lines.
export function chunkScript(text: string, maxChars = 18000): string[] {
  if (text.length <= maxChars) return [text];
  const chunks: string[] = [];
  let current = '';
  const lines = text.split('\n');
  const sceneStart = /^(INT\.|EXT\.|INT\/EXT\.|I\/E\.|EXT\/INT\.|SCENE\s+\d+)/i;
  for (const line of lines) {
    if (current.length + line.length + 1 > maxChars && sceneStart.test(line)) {
      chunks.push(current);
      current = '';
    }
    current += line + '\n';
  }
  if (current) chunks.push(current);
  return chunks;
}
