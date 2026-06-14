import { defineConfig } from 'vitest/config';

// Vitest config for backend.
//
// We set process.env defaults here so importing `src/config/env.ts` doesn't
// blow up under test. Real secrets are never needed — the AI tests mock
// `openai` and the few DB tests we have mock `@prisma/client`.

process.env.NODE_ENV ??= 'test';
process.env.LOG_LEVEL ??= 'warn';
process.env.JWT_SECRET ??= 'test-secret-please-ignore-32-chars-min';
process.env.JWT_ISSUER ??= 'circuit-test';
process.env.JWT_AUDIENCE ??= 'circuit-test-mobile';
process.env.DATABASE_URL ??= 'postgresql://test:test@localhost:5432/circuit_test';
process.env.OPENAI_API_KEY ??= 'sk-test';
process.env.OPENAI_MODEL ??= 'gpt-4o-test';
process.env.OPENAI_MODEL_FAST ??= 'gpt-4o-mini-test';
process.env.OTP_PROVIDER ??= 'MOCK';
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
