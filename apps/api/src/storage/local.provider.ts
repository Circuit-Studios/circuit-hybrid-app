import { createReadStream, type ReadStream } from 'node:fs';
import { mkdir, stat, writeFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { GetObjectStream, PutObjectInput, PutObjectResult, StorageProvider } from './types.js';

// Resolves to <repo>/uploads. Mirrors the legacy `multer.diskStorage` path
// used before this abstraction existed, so existing rows still resolve.
const UPLOADS_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../uploads');

export class LocalStorageProvider implements StorageProvider {
  async put(input: PutObjectInput): Promise<PutObjectResult> {
    await mkdir(UPLOADS_ROOT, { recursive: true });
    const fullPath = path.join(UPLOADS_ROOT, input.key);
    await mkdir(path.dirname(fullPath), { recursive: true });
    await writeFile(fullPath, input.body);
    return { storageKey: fullPath, bytes: input.body.length };
  }

  async get(storageKey: string): Promise<GetObjectStream> {
    // Older script rows were stored with the absolute path as `storageKey`,
    // newer rows with a relative key under uploads/. Handle both.
    const fullPath = path.isAbsolute(storageKey) ? storageKey : path.join(UPLOADS_ROOT, storageKey);
    const fileStat = await stat(fullPath);
    const stream: ReadStream = createReadStream(fullPath);
    return {
      stream,
      contentLength: fileStat.size,
      contentType: 'application/pdf',
    };
  }

  async delete(storageKey: string): Promise<void> {
    const fullPath = path.isAbsolute(storageKey) ? storageKey : path.join(UPLOADS_ROOT, storageKey);
    try {
      await unlink(fullPath);
    } catch (err) {
      // Already gone is fine — don't fail the caller.
      const code = (err as NodeJS.ErrnoException).code;
      if (code !== 'ENOENT') throw err;
    }
  }

  async presignUpload(): Promise<null> {
    return null;
  }
}
