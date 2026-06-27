import { env, llmRoleProviders } from '../../config/env.js';
import { GeminiLlmProvider } from './gemini.client.js';
import { NvidiaLlmProvider } from './nvidia.client.js';
import type {
  ChatJsonOptions,
  ChatJsonResult,
  LlmChatProvider,
  LlmProvider,
  LlmRole,
} from './types.js';

export type {
  ChatJsonInput,
  ChatJsonOptions,
  ChatJsonResult,
  LlmProvider,
  LlmRole,
  LlmStage,
  LlmTokenUsage,
} from './types.js';
export { LlmError } from './errors.js';
export { logLlmRun } from './logLlmRun.js';

const providerCache = new Map<LlmProvider, LlmChatProvider>();

export function resetLlmProviderForTests(): void {
  providerCache.clear();
}

/**
 * Resolve which provider serves a given pipeline role.
 * Single source of truth: LLM_PROVIDER (+ optional per-role LLM_PROVIDER_* overrides).
 */
function providerForRole(role: LlmRole): LlmProvider {
  const roles = llmRoleProviders(env);
  switch (role) {
    case 'extractor':
      return roles.extractor;
    case 'fast':
      return roles.fast;
    case 'planner':
    case 'fallback':
    default:
      return roles.planner;
  }
}

function getProvider(name: LlmProvider): LlmChatProvider {
  let provider = providerCache.get(name);
  if (!provider) {
    provider = name === 'GEMINI' ? new GeminiLlmProvider() : new NvidiaLlmProvider();
    providerCache.set(name, provider);
  }
  return provider;
}

/** Default provider (planner role) — kept for backward compatibility. */
export function getLlmProvider(): LlmChatProvider {
  return getProvider(providerForRole('planner'));
}

/** Provider-agnostic JSON chat entry point used by all AI pipelines. */
export async function chatJson<T>(opts: ChatJsonOptions<T>): Promise<ChatJsonResult<T>> {
  return getProvider(providerForRole(opts.role)).chatJson(opts);
}

/** Returns parsed data only (convenience wrapper). */
export async function chatJsonData<T>(opts: ChatJsonOptions<T>): Promise<T> {
  const result = await chatJson(opts);
  return result.data;
}

/** @alias chatJson */
export async function chatJsonWithUsage<T>(opts: ChatJsonOptions<T>): Promise<ChatJsonResult<T>> {
  return chatJson(opts);
}
