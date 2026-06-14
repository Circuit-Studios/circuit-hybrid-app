// Storage abstraction so callers (script upload, future poster uploads,
// shot reference photos) don't need to know whether bytes live on local disk
// Script PDFs and uploads — local disk (`uploads/`).

export interface PutObjectInput {
  /** Logical destination key under the bucket / uploads root. */
  key: string;
  body: Buffer | Uint8Array;
  contentType: string;
}

export interface PutObjectResult {
  /** Storage-scheme-specific identifier (e.g. local path or s3://...). */
  storageKey: string;
  bytes: number;
}

export interface GetObjectStream {
  stream: NodeJS.ReadableStream;
  contentLength: number;
  contentType: string;
}

export interface StorageProvider {
  put(input: PutObjectInput): Promise<PutObjectResult>;
  get(storageKey: string): Promise<GetObjectStream>;
  delete(storageKey: string): Promise<void>;
  /**
   * Optional pre-signed URL support. Returns null if the provider doesn't
   * support presigning (local disk).
   */
  presignUpload(input: {
    key: string;
    contentType: string;
    expiresInSeconds?: number;
  }): Promise<{ url: string; storageKey: string; expiresAt: Date } | null>;
}
