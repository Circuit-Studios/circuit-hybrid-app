import './load-env.js';
import { z } from 'zod';
import {
  assertProductionDirectRegisterDisabled,
  assertProductionOtpProviders,
  assertResendEmailOtpConfig,
} from './env-guards.js';

const emptyToUndefined = (value: unknown) => (value === '' ? undefined : value);

/** Env vars are always strings — `z.coerce.boolean()` treats `"false"` as true. */
function envBoolean(defaultValue: boolean) {
  return z.preprocess((value) => {
    if (value === undefined || value === '') return defaultValue;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      if (normalized === 'true' || normalized === '1' || normalized === 'yes') return true;
      if (normalized === 'false' || normalized === '0' || normalized === 'no') return false;
    }
    return Boolean(value);
  }, z.boolean());
}

const optionalUrl = z.preprocess(emptyToUndefined, z.string().url().optional());

const optionalString = z.preprocess(emptyToUndefined, z.string().optional());

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  APP_ENV: z.enum(['local', 'dev', 'prod']).default('local'),
  PORT: z.coerce.number().int().positive().default(3009),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('debug'),

  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 chars'),
  JWT_ISSUER: z.string().default('circuit-api'),
  JWT_AUDIENCE: z.string().default('circuit-mobile'),
  JWT_EXPIRES_IN: z.string().default('7d'),

  /** @deprecated Use EMAIL_OTP_PROVIDER / PHONE_OTP_PROVIDER */
  OTP_PROVIDER: z.enum(['MOCK', 'MSG91', 'TWILIO', 'RESEND_EMAIL']).default('MOCK'),
  OTP_SECRET: z.string().min(32, 'OTP_SECRET must be at least 32 chars'),
  OTP_FROM_EMAIL: optionalString,

  SIGNUP_VERIFICATION_CHANNEL: z.enum(['EMAIL', 'PHONE']).default('EMAIL'),
  LOGIN_IDENTIFIER: z.enum(['PHONE', 'EMAIL', 'BOTH']).default('PHONE'),
  EMAIL_OTP_PROVIDER: z.enum(['MOCK', 'RESEND']).default('MOCK'),
  PHONE_OTP_PROVIDER: z.enum(['MOCK', 'MSG91', 'TWILIO']).default('MOCK'),
  ALLOW_MOCK_OTP_IN_PROD: envBoolean(false),

  RESEND_API_KEY: optionalString,
  RESEND_OTP_TEMPLATE_ID: optionalString,
  RESEND_OTP_EXPIRES_MINUTES: z.coerce.number().int().positive().default(5),
  RESEND_FROM_EMAIL: optionalString,
  RESEND_REPLY_TO: optionalString,

  ALLOW_DIRECT_REGISTER: envBoolean(false),

  MSG91_AUTH_KEY: optionalString,
  MSG91_SENDER_ID: optionalString,
  MSG91_TEMPLATE_ID: optionalString,

  DATABASE_URL: z.string().url(),

  REDIS_URL: optionalUrl,

  LLM_PROVIDER: z.preprocess(emptyToUndefined, z.enum(['NVIDIA', 'GEMINI']).default('NVIDIA')),
  // Optional per-role provider overrides — fall back to LLM_PROVIDER when unset.
  LLM_PROVIDER_EXTRACTOR: z.preprocess(emptyToUndefined, z.enum(['NVIDIA', 'GEMINI']).optional()),
  LLM_PROVIDER_PLANNER: z.preprocess(emptyToUndefined, z.enum(['NVIDIA', 'GEMINI']).optional()),
  LLM_PROVIDER_FAST: z.preprocess(emptyToUndefined, z.enum(['NVIDIA', 'GEMINI']).optional()),

  NVIDIA_API_KEY: optionalString,
  NVIDIA_BASE_URL: z.preprocess(
    emptyToUndefined,
    z.string().url().default('https://integrate.api.nvidia.com/v1'),
  ),
  NVIDIA_MODEL_EXTRACTOR: optionalString,
  NVIDIA_MODEL_PLANNER: optionalString,
  NVIDIA_MODEL_FAST: optionalString,
  NVIDIA_MODEL_FALLBACK: optionalString,

  GEMINI_API_KEY: optionalString,
  GEMINI_BASE_URL: z.preprocess(
    emptyToUndefined,
    z.string().url().default('https://generativelanguage.googleapis.com/v1beta'),
  ),
  GEMINI_MODEL_EXTRACTOR: optionalString,
  GEMINI_MODEL_PLANNER: optionalString,
  GEMINI_MODEL_FAST: optionalString,

  LLM_MAX_SCRIPT_CHARS: z.coerce.number().int().positive().default(250_000),
  LLM_MAX_CHUNK_CHARS: z.coerce.number().int().positive().default(18_000),
  LLM_PLANNER_TEMPERATURE: z.coerce.number().min(0).max(2).default(0.2),
  LLM_EXTRACTOR_TEMPERATURE: z.coerce.number().min(0).max(2).default(0.1),
  LLM_FAST_TEMPERATURE: z.coerce.number().min(0).max(2).default(0),
  LLM_JSON_REPAIR_RETRIES: z.coerce.number().int().min(0).max(3).default(1),
  LLM_REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().default(180_000),

  LANGSMITH_TRACING: envBoolean(false),
  LANGSMITH_API_KEY: z.string().optional(),
  LANGSMITH_PROJECT: z.string().optional(),

  EXPO_PUSH_PROVIDER: z.enum(['MOCK', 'EXPO']).default('MOCK'),
  EXPO_ACCESS_TOKEN: z.string().optional(),

  CORS_ORIGINS: z.string().default(''),
});

export type Env = z.infer<typeof schema>;

function applyLegacyOtpProvider(data: Env): Env {
  let next = data;
  if (!process.env.EMAIL_OTP_PROVIDER && data.OTP_PROVIDER === 'RESEND_EMAIL') {
    next = { ...next, EMAIL_OTP_PROVIDER: 'RESEND' };
  }
  if (!process.env.PHONE_OTP_PROVIDER) {
    if (data.OTP_PROVIDER === 'MSG91') {
      next = { ...next, PHONE_OTP_PROVIDER: 'MSG91' };
    } else if (data.OTP_PROVIDER === 'TWILIO') {
      next = { ...next, PHONE_OTP_PROVIDER: 'TWILIO' };
    }
  }
  return next;
}

type LlmProviderName = Env['LLM_PROVIDER'];
type LlmRoleName = 'extractor' | 'planner' | 'fast';

/** Resolve which provider serves each role (per-role override → global default). */
export function llmRoleProviders(data: Env = env): Record<LlmRoleName, LlmProviderName> {
  return {
    extractor: data.LLM_PROVIDER_EXTRACTOR ?? data.LLM_PROVIDER,
    planner: data.LLM_PROVIDER_PLANNER ?? data.LLM_PROVIDER,
    fast: data.LLM_PROVIDER_FAST ?? data.LLM_PROVIDER,
  };
}

function resolveNvidiaModels(data: Env): Env {
  const planner = data.NVIDIA_MODEL_PLANNER;
  const extractor = data.NVIDIA_MODEL_EXTRACTOR ?? planner;
  const fast = data.NVIDIA_MODEL_FAST ?? extractor;
  return {
    ...data,
    NVIDIA_MODEL_EXTRACTOR: extractor,
    NVIDIA_MODEL_FAST: fast,
    NVIDIA_MODEL_FALLBACK: data.NVIDIA_MODEL_FALLBACK ?? planner,
  };
}

function resolveGeminiModels(data: Env): Env {
  const planner = data.GEMINI_MODEL_PLANNER;
  const extractor = data.GEMINI_MODEL_EXTRACTOR ?? planner;
  const fast = data.GEMINI_MODEL_FAST ?? extractor ?? planner;
  return {
    ...data,
    GEMINI_MODEL_EXTRACTOR: extractor,
    GEMINI_MODEL_FAST: fast,
  };
}

function assertLlmProviderConfig(data: Env): void {
  const used = new Set(Object.values(llmRoleProviders(data)));
  const errors: string[] = [];

  if (used.has('NVIDIA')) {
    if (!data.NVIDIA_API_KEY) errors.push('NVIDIA_API_KEY: required when any role uses NVIDIA');
    if (!data.NVIDIA_MODEL_PLANNER && !data.NVIDIA_MODEL_EXTRACTOR && !data.NVIDIA_MODEL_FAST) {
      errors.push('NVIDIA_MODEL_PLANNER: required when any role uses NVIDIA');
    }
  }

  if (used.has('GEMINI')) {
    if (!data.GEMINI_API_KEY) errors.push('GEMINI_API_KEY: required when any role uses Gemini');
    if (!data.GEMINI_MODEL_PLANNER && !data.GEMINI_MODEL_EXTRACTOR && !data.GEMINI_MODEL_FAST) {
      errors.push('GEMINI_MODEL_PLANNER: required when any role uses Gemini');
    }
  }

  if (errors.length > 0) {
    console.error('Invalid environment configuration:');
    for (const e of errors) console.error(`  - ${e}`);
    process.exit(1);
  }
}

function loadEnv(): Env {
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    console.error('Invalid environment configuration:');
    for (const issue of parsed.error.issues) {
      console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
    }
    process.exit(1);
  }

  let resolved = applyLegacyOtpProvider(parsed.data);
  resolved = resolveNvidiaModels(resolved);
  resolved = resolveGeminiModels(resolved);
  assertLlmProviderConfig(resolved);
  assertResendEmailOtpConfig(resolved);
  assertProductionOtpProviders(resolved);
  assertProductionDirectRegisterDisabled(resolved);
  return resolved;
}

export const env = loadEnv();

export const corsOrigins: string[] = env.CORS_ORIGINS.split(',')
  .map((s) => s.trim())
  .filter(Boolean);
