import type { ZodSchema } from 'zod';

export type LlmRole = 'extractor' | 'planner' | 'fast';

export interface ChatJsonOptions<T> {
  role: LlmRole;
  systemPrompt: string;
  userPrompt: string;
  schema: ZodSchema<T>;
  schemaName: string;
  temperature?: number;
  maxTokens?: number;
  /** Pipeline stage label for usage logging (e.g. scene_extraction). */
  stage?: string;
  projectId?: string;
  scriptId?: string;
}

export interface LlmTokenUsage {
  inputTokens?: number;
  outputTokens?: number;
}

export interface ChatJsonResult<T> {
  data: T;
  usage?: LlmTokenUsage;
}

export interface LlmChatProvider {
  readonly name: 'OPENAI' | 'NVIDIA';
  chatJson<T>(opts: ChatJsonOptions<T>): Promise<ChatJsonResult<T>>;
}
