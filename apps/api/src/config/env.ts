import './load-env.js';
import { z } from 'zod';

const emptyToUndefined = (value: unknown) => (value === '' ? undefined : value);

const optionalUrl = z.preprocess(emptyToUndefined, z.string().url().optional());

const optionalString = z.preprocess(emptyToUndefined, z.string().optional());

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3009),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('debug'),

  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 chars'),
  JWT_ISSUER: z.string().default('circuit-api'),
  JWT_AUDIENCE: z.string().default('circuit-mobile'),
  JWT_EXPIRES_IN: z.string().default('7d'),

  OTP_EMAIL_PROVIDER: z.enum(['MOCK', 'RESEND']).default('MOCK'),
  EMAIL_FROM: optionalString,
  RESEND_API_KEY: optionalString,

  OTP_PROVIDER: z.enum(['MOCK', 'MSG91', 'TWILIO']).default('MOCK'),
  MSG91_AUTH_KEY: optionalString,
  MSG91_SENDER_ID: optionalString,
  MSG91_TEMPLATE_ID: optionalString,

  DATABASE_URL: z.string().url(),

  // Redis powers BullMQ (conflict detector queue) and is optional in dev —
  // if unset we run conflict scans inline on the request thread.
  REDIS_URL: optionalUrl,

  OPENAI_API_KEY: z.string().min(1, 'OPENAI_API_KEY is required'),
  OPENAI_MODEL: z.string().default('gpt-4o'),
  OPENAI_MODEL_FAST: z.string().default('gpt-4o-mini'),
  OPENAI_MAX_RETRIES: z.coerce.number().int().min(0).max(10).default(3),

  LANGSMITH_TRACING: z.coerce.boolean().default(false),
  LANGSMITH_API_KEY: z.string().optional(),
  LANGSMITH_PROJECT: z.string().optional(),

  EXPO_PUSH_PROVIDER: z.enum(['MOCK', 'EXPO']).default('MOCK'),
  EXPO_ACCESS_TOKEN: z.string().optional(),

  CORS_ORIGINS: z.string().default(''),
});

export type Env = z.infer<typeof schema>;

function loadEnv(): Env {
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    console.error('Invalid environment configuration:');
    for (const issue of parsed.error.issues) {
      console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
    }
    process.exit(1);
  }
  return parsed.data;
}

export const env = loadEnv();

export const corsOrigins: string[] = env.CORS_ORIGINS
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);
