import { env } from '../../config/env.js';
import { logger } from '../../lib/logger.js';
import { LlmError, LlmJsonParseError } from './errors.js';
import { parseAndValidate, repairSnippetFromError } from './json-parse.js';
import { recordLlmRun } from './usage.js';
import type {
  ChatJsonOptions,
  ChatJsonResult,
  LlmProvider,
  LlmRole,
  LlmTokenUsage,
} from './types.js';

/** One provider HTTP call: build the request body, POST it, return raw text + usage. */
export interface ProviderGenerateRequest {
  model: string;
  systemPrompt: string;
  userPrompt: string;
  schemaName: string;
  temperature: number;
  maxTokens?: number;
  stage: string;
  /**
   * When set, this is a JSON-repair attempt and contains the invalid snippet
   * from the previous response. Providers should append the repair prompt and
   * regenerate, rather than treating it as a fresh request.
   */
  repairSnippet?: string;
}

export interface ProviderRawResult {
  raw: string | undefined;
  usage?: LlmTokenUsage;
}

/**
 * Provider-specific surface consumed by {@link runJsonChat}. Implementations
 * own only request formatting + HTTP; all retry/repair/record orchestration is
 * shared. Adding a provider means implementing these three members.
 */
export interface LlmProviderClient {
  readonly name: LlmProvider;
  modelForRole(role: LlmRole): string;
  /** Model used for the JSON-repair attempt (often a cheaper/faster model). */
  repairModelForRole(role: LlmRole, primaryModel: string): string;
  generate(req: ProviderGenerateRequest): Promise<ProviderRawResult>;
}

export function temperatureForRole(role: LlmRole, override?: number): number {
  if (override !== undefined) return override;
  switch (role) {
    case 'extractor':
      return env.LLM_EXTRACTOR_TEMPERATURE;
    case 'fast':
      return env.LLM_FAST_TEMPERATURE;
    case 'planner':
    case 'fallback':
    default:
      return env.LLM_PLANNER_TEMPERATURE;
  }
}

/**
 * Shared JSON chat orchestration: model selection, repair decision, schema
 * validation, success/failure recording, safe logging, and duration tracking.
 *
 * Only malformed-JSON failures trigger the repair path; transient failures
 * (timeouts, HTTP 5xx) are plain-retried since there is no content to fix.
 */
export async function runJsonChat<T>(
  client: LlmProviderClient,
  opts: ChatJsonOptions<T>,
): Promise<ChatJsonResult<T>> {
  const model = client.modelForRole(opts.role);
  const stage = String(opts.stage ?? opts.schemaName);
  const started = Date.now();

  logger.debug(
    { provider: client.name, model, stage, promptChars: opts.userPrompt.length },
    'llm.begin',
  );

  let lastErr: unknown;
  const maxAttempts = 1 + env.LLM_JSON_REPAIR_RETRIES;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const isRepair = attempt > 0 && lastErr instanceof LlmJsonParseError;
    try {
      const { raw, usage } = await client.generate({
        model: isRepair ? client.repairModelForRole(opts.role, model) : model,
        systemPrompt: opts.systemPrompt,
        userPrompt: opts.userPrompt,
        schemaName: opts.schemaName,
        temperature: isRepair ? 0 : temperatureForRole(opts.role, opts.temperature),
        maxTokens: opts.maxTokens,
        stage: isRepair ? 'json_repair' : stage,
        repairSnippet: isRepair ? repairSnippetFromError(lastErr) : undefined,
      });
      const data = await parseAndValidate(raw, opts.schema, opts.schemaName);

      const durationMs = Date.now() - started;
      await recordLlmRun(
        {
          provider: client.name,
          model,
          stage: isRepair ? 'json_repair' : stage,
          projectId: opts.projectId,
          scriptId: opts.scriptId,
        },
        'SUCCEEDED',
        durationMs,
        usage,
      );
      return { data, provider: client.name, model, usage, durationMs };
    } catch (err) {
      lastErr = err;
      if (attempt >= maxAttempts - 1) {
        const message = err instanceof Error ? err.message : String(err);
        const durationMs = Date.now() - started;
        await recordLlmRun(
          {
            provider: client.name,
            model,
            stage,
            projectId: opts.projectId,
            scriptId: opts.scriptId,
          },
          'FAILED',
          durationMs,
          undefined,
          message,
        );
        throw err instanceof LlmError
          ? err
          : new LlmError(message, { provider: client.name, stage, cause: err });
      }
    }
  }

  throw lastErr;
}
