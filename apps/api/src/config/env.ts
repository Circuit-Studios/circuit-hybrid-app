import './load-env.js';
import { z } from 'zod';
import {
  assertProductionDirectRegisterDisabled,
  assertProductionOtpProviders,
  assertResendEmailOtpConfig,
} from './env-guards.js';

const emptyToUndefined = (value: unknown) => (value === '' ? undefined : value);

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
  ALLOW_MOCK_OTP_IN_PROD: z.coerce.boolean().default(false),

  RESEND_API_KEY: optionalString,
  RESEND_OTP_TEMPLATE_ID: optionalString,
  RESEND_OTP_EXPIRES_MINUTES: z.coerce.number().int().positive().default(5),
  RESEND_FROM_EMAIL: optionalString,
  RESEND_REPLY_TO: optionalString,

  ALLOW_DIRECT_REGISTER: z.coerce.boolean().default(false),

  MSG91_AUTH_KEY: optionalString,
  MSG91_SENDER_ID: optionalString,
  MSG91_TEMPLATE_ID: optionalString,

  DATABASE_URL: z.string().url(),

  REDIS_URL: optionalUrl,

  LLM_PROVIDER: z.literal('NVIDIA').default('NVIDIA'),
  NVIDIA_API_KEY: optionalString,
  NVIDIA_BASE_URL: z.preprocess(
    emptyToUndefined,
    z.string().url().default('https://integrate.api.nvidia.com/v1'),
  ),
  NVIDIA_MODEL_EXTRACTOR: optionalString,
  NVIDIA_MODEL_PLANNER: optionalString,
  NVIDIA_MODEL_FAST: optionalString,
  NVIDIA_MODEL_FALLBACK: optionalString,
  LLM_MAX_SCRIPT_CHARS: z.coerce.number().int().positive().default(250_000),
  LLM_MAX_CHUNK_CHARS: z.coerce.number().int().positive().default(18_000),
  LLM_PLANNER_TEMPERATURE: z.coerce.number().min(0).max(2).default(0.2),
  LLM_EXTRACTOR_TEMPERATURE: z.coerce.number().min(0).max(2).default(0.1),
  LLM_FAST_TEMPERATURE: z.coerce.number().min(0).max(2).default(0),
  LLM_JSON_REPAIR_RETRIES: z.coerce.number().int().min(0).max(3).default(1),
  LLM_REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().default(120_000),

  LANGSMITH_TRACING: z.coerce.boolean().default(false),
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

function resolveNvidiaModels(data: Env): Env {
  const planner = data.NVIDIA_MODEL_PLANNER!;
  const extractor = data.NVIDIA_MODEL_EXTRACTOR ?? planner;
  const fast = data.NVIDIA_MODEL_FAST ?? extractor;
  return {
    ...data,
    NVIDIA_MODEL_EXTRACTOR: extractor,
    NVIDIA_MODEL_FAST: fast,
    NVIDIA_MODEL_FALLBACK: data.NVIDIA_MODEL_FALLBACK ?? planner,
  };
}

function assertLlmProviderConfig(data: Env): void {
  if (!data.NVIDIA_API_KEY) {
    console.error('Invalid environment configuration:');
    console.error('  - NVIDIA_API_KEY: required');
    process.exit(1);
  }
  if (!data.NVIDIA_MODEL_PLANNER) {
    console.error('Invalid environment configuration:');
    console.error('  - NVIDIA_MODEL_PLANNER: required');
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
