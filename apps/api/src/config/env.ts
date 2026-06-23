import './load-env.js';
import { z } from 'zod';

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
  RESEND_FROM_EMAIL: optionalString,
  RESEND_REPLY_TO: optionalString,

  MSG91_AUTH_KEY: optionalString,
  MSG91_SENDER_ID: optionalString,
  MSG91_TEMPLATE_ID: optionalString,

  DATABASE_URL: z.string().url(),

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

function assertProductionOtpProviders(config: Env): void {
  if (config.APP_ENV !== 'prod' || config.ALLOW_MOCK_OTP_IN_PROD) return;

  const mockProviders: string[] = [];
  if (config.EMAIL_OTP_PROVIDER === 'MOCK') mockProviders.push('EMAIL_OTP_PROVIDER=MOCK');
  if (config.PHONE_OTP_PROVIDER === 'MOCK') mockProviders.push('PHONE_OTP_PROVIDER=MOCK');

  if (mockProviders.length > 0) {
    console.error(
      `APP_ENV=prod cannot start with MOCK OTP providers (${mockProviders.join(', ')}). ` +
        'Set real providers or ALLOW_MOCK_OTP_IN_PROD=true for emergency testing only.',
    );
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

  const resolved = applyLegacyOtpProvider(parsed.data);
  assertProductionOtpProviders(resolved);
  return resolved;
}

export const env = loadEnv();

export const corsOrigins: string[] = env.CORS_ORIGINS.split(',')
  .map(s => s.trim())
  .filter(Boolean);
