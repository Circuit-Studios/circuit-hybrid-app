export type LlmProviderName = 'OPENAI' | 'NVIDIA';

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
