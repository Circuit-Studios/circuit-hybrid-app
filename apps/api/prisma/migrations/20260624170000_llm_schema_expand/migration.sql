-- Expand AI pipeline storage for full LLM schema outputs and usage tracking.

ALTER TABLE "TaskSuggestion" ADD COLUMN IF NOT EXISTS "rationale" TEXT;
ALTER TABLE "TaskSuggestion" ADD COLUMN IF NOT EXISTS "confidence" DOUBLE PRECISION;

ALTER TABLE "ShootingPlan" ADD COLUMN IF NOT EXISTS "assumptions" JSONB;
ALTER TABLE "ShootingPlan" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'DRAFT';

ALTER TABLE "LlmRun" ADD COLUMN IF NOT EXISTS "totalTokens" INTEGER;

CREATE INDEX IF NOT EXISTS "LlmRun_provider_model_createdAt_idx"
  ON "LlmRun"("provider", "model", "createdAt");
