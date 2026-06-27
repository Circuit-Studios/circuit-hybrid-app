import type { ZodType, ZodTypeDef } from 'zod';

export type LlmProvider = 'NVIDIA';

export type LlmRole = 'extractor' | 'planner' | 'fast' | 'fallback';

export type LlmStage =
  | 'scene_extraction'
  | 'department_breakdown'
  | 'task_suggestions'
  | 'shooting_plan'
  | 'json_repair'
  | string;

export interface ChatJsonOptions<T> {
  role: LlmRole;
  stage: LlmStage;
  systemPrompt: string;
  userPrompt: string;
  // Input type is `any` so `T` always binds to the schema's OUTPUT type, even
  // when the schema uses preprocess/transform (input ≠ output).
  schema: ZodType<T, ZodTypeDef, any>;
  schemaName: string;
  temperature?: number;
  maxTokens?: number;
  projectId?: string;
  scriptId?: string;
}

/** @alias ChatJsonOptions */
export type ChatJsonInput<T> = ChatJsonOptions<T>;

export interface LlmTokenUsage {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
}

export interface ChatJsonResult<T> {
  data: T;
  provider: LlmProvider;
  model: string;
  usage?: LlmTokenUsage;
  durationMs: number;
}

export interface LlmChatProvider {
  readonly name: LlmProvider;
  chatJson<T>(opts: ChatJsonOptions<T>): Promise<ChatJsonResult<T>>;
}
