export type LlmProviderName = 'NVIDIA';

/** Max chars of model output passed to JSON repair — memory only, never logged. */
export const LLM_RAW_OUTPUT_REPAIR_MAX_CHARS = 2000;

/** Parse/validation failure with truncated raw model output for in-memory repair only. */
export class LlmJsonParseError extends Error {
  readonly schemaName: string;
  readonly kind: 'empty' | 'invalid_json' | 'schema_mismatch';
  /** Truncated model output for repair prompts — do not log or persist. */
  readonly rawOutputSnippet: string;

  constructor(opts: {
    message: string;
    schemaName: string;
    kind: 'empty' | 'invalid_json' | 'schema_mismatch';
    rawOutput?: string | null;
  }) {
    super(opts.message);
    this.name = 'LlmJsonParseError';
    this.schemaName = opts.schemaName;
    this.kind = opts.kind;
    this.rawOutputSnippet = truncateRawForRepair(opts.rawOutput);
  }
}

export function truncateRawForRepair(raw?: string | null): string {
  if (!raw?.trim()) return '';
  return raw.trim().slice(0, LLM_RAW_OUTPUT_REPAIR_MAX_CHARS);
}

/** Safe LLM failure — never includes API keys, raw prompts, or script text. */
export class LlmError extends Error {
  readonly provider: LlmProviderName;
  readonly statusCode?: number;
  readonly stage?: string;

  constructor(
    message: string,
    opts: { provider: LlmProviderName; statusCode?: number; stage?: string; cause?: unknown },
  ) {
    super(message, { cause: opts.cause });
    this.name = 'LlmError';
    this.provider = opts.provider;
    this.statusCode = opts.statusCode;
    this.stage = opts.stage;
  }
}
