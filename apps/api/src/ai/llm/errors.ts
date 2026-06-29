export type LlmProviderName = 'NVIDIA' | 'GEMINI';

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

export type LlmErrorKind = 'request' | 'timeout';

/** Safe LLM failure — never includes API keys, raw prompts, or script text. */
export class LlmError extends Error {
  readonly provider: LlmProviderName;
  readonly statusCode?: number;
  readonly stage?: string;
  readonly kind: LlmErrorKind;

  constructor(
    message: string,
    opts: {
      provider: LlmProviderName;
      statusCode?: number;
      stage?: string;
      kind?: LlmErrorKind;
      cause?: unknown;
    },
  ) {
    super(message, { cause: opts.cause });
    this.name = 'LlmError';
    this.provider = opts.provider;
    this.statusCode = opts.statusCode;
    this.stage = opts.stage;
    this.kind = opts.kind ?? 'request';
  }
}

/**
 * Map any pipeline failure to a user-safe summary for client-facing fields
 * (Script.analysisError, BackgroundJob.error). Provider response bodies, prompt
 * text, and stack details are deliberately excluded — those belong in internal
 * logs only, never in a mobile-visible string.
 */
export function toSafeAnalysisError(error: unknown): string {
  if (error instanceof LlmJsonParseError) return 'AI response failed validation';
  if (error instanceof LlmError) {
    return error.kind === 'timeout' ? 'AI provider timeout' : 'AI provider request failed';
  }
  return 'AI analysis failed';
}
