import { defineConfig } from 'vitest/config';

// Vitest config for backend.
//
// We set process.env defaults here so importing `src/config/env.ts` doesn't
// blow up under test. Real secrets are never needed — AI tests mock `fetch`.

process.env.NODE_ENV ??= 'test';
process.env.LOG_LEVEL ??= 'warn';
process.env.JWT_SECRET ??= 'test-secret-please-ignore-32-chars-min';
process.env.JWT_ISSUER ??= 'circuit-test';
process.env.JWT_AUDIENCE ??= 'circuit-test-mobile';
process.env.DATABASE_URL ??= 'postgresql://test:test@localhost:5432/circuit_test';
process.env.LLM_PROVIDER ??= 'NVIDIA';
process.env.NVIDIA_API_KEY ??= 'nvapi-test';
process.env.NVIDIA_MODEL_PLANNER ??= 'nvidia/test-planner';
process.env.NVIDIA_MODEL_EXTRACTOR ??= 'nvidia/test-extractor';
process.env.NVIDIA_MODEL_FAST ??= 'nvidia/test-fast';
process.env.GEMINI_API_KEY ??= 'gemini-test';
process.env.GEMINI_MODEL_PLANNER ??= 'gemini-test-planner';
process.env.GEMINI_MODEL_EXTRACTOR ??= 'gemini-test-extractor';
process.env.GEMINI_MODEL_FAST ??= 'gemini-test-fast';
process.env.APP_ENV ??= 'local';
process.env.EMAIL_OTP_PROVIDER ??= 'MOCK';
process.env.PHONE_OTP_PROVIDER ??= 'MOCK';
process.env.OTP_PROVIDER ??= 'MOCK';
process.env.OTP_SECRET ??= 'test-otp-secret-32-chars-minimum!!';
process.env.EXPO_PUSH_PROVIDER ??= 'MOCK';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    globals: false,
    testTimeout: 15_000,
    pool: 'forks',
    coverage: {
      reporter: ['text', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/server/index.ts'],
    },
  },
});
