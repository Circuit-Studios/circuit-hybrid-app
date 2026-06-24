import { env } from '../../config/env.js';
import { isFeatureEnabled } from '../../config/features.js';
import { NvidiaLlmProvider } from './nvidia.client.js';
import { OpenAiLlmProvider } from './openai.client.js';
import type { ChatJsonOptions, ChatJsonResult, LlmChatProvider } from './types.js';

export type { ChatJsonOptions, ChatJsonResult, LlmRole, LlmTokenUsage } from './types.js';

let cachedProvider: LlmChatProvider | null = null;

export function resetLlmProviderForTests(): void {
  cachedProvider = null;
}

export async function getLlmProvider(): Promise<LlmChatProvider> {
  if (cachedProvider) return cachedProvider;

  if (env.LLM_PROVIDER === 'NVIDIA') {
    const nvidiaEnabled = await isFeatureEnabled('llm.nvidia');
    if (!nvidiaEnabled) {
      throw new Error('NVIDIA LLM provider is disabled by feature flag');
    }
    cachedProvider = new NvidiaLlmProvider();
    return cachedProvider;
  }

  cachedProvider = new OpenAiLlmProvider();
  return cachedProvider;
}

/** Provider-agnostic JSON chat entry point used by all AI pipelines. */
export async function chatJson<T>(opts: ChatJsonOptions<T>): Promise<T> {
  const provider = await getLlmProvider();
  const result = await provider.chatJson(opts);
  return result.data;
}

/** Legacy-compatible shape for callers that need usage metadata. */
export async function chatJsonWithUsage<T>(opts: ChatJsonOptions<T>): Promise<ChatJsonResult<T>> {
  const provider = await getLlmProvider();
  return provider.chatJson(opts);
}
