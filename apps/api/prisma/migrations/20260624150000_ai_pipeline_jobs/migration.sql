-- AI pipeline durability: background jobs, shooting plans, task suggestions, LLM usage.

CREATE TYPE "BackgroundJobStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED');
CREATE TYPE "BackgroundJobKind" AS ENUM ('SCRIPT_ANALYSIS', 'SHOOTING_PLAN');
CREATE TYPE "TaskSuggestionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CONVERTED');
CREATE TYPE "LlmRunStatus" AS ENUM ('SUCCEEDED', 'FAILED');

CREATE TABLE "BackgroundJob" (
  "id" TEXT NOT NULL,
  "kind" "BackgroundJobKind" NOT NULL,
  "status" "BackgroundJobStatus" NOT NULL DEFAULT 'PENDING',
  "projectId" TEXT NOT NULL,
  "scriptId" TEXT,
  "payload" JSONB,
  "error" TEXT,
  "startedAt" TIMESTAMP(3),
  "endedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BackgroundJob_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ShootingPlan" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "scriptId" TEXT NOT NULL,
  "summary" TEXT NOT NULL,
  "totalShootDays" INTEGER NOT NULL,
  "risks" JSONB NOT NULL,
  "plan" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ShootingPlan_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TaskSuggestion" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "scriptId" TEXT,
  "shootingPlanId" TEXT,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "departmentKind" "DepartmentKind" NOT NULL,
  "priority" "TaskPriority" NOT NULL DEFAULT 'MEDIUM',
  "sceneNumbers" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "characterNames" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "estimatedDueOffsetDays" INTEGER,
  "status" "TaskSuggestionStatus" NOT NULL DEFAULT 'PENDING',
  "convertedTaskId" TEXT,
  "reviewedByUserId" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TaskSuggestion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LlmRun" (
  "id" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "model" TEXT NOT NULL,
  "stage" TEXT NOT NULL,
  "projectId" TEXT,
  "scriptId" TEXT,
  "inputTokens" INTEGER,
  "outputTokens" INTEGER,
  "durationMs" INTEGER NOT NULL,
  "status" "LlmRunStatus" NOT NULL,
  "error" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LlmRun_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "BackgroundJob"
  ADD CONSTRAINT "BackgroundJob_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BackgroundJob"
  ADD CONSTRAINT "BackgroundJob_scriptId_fkey"
  FOREIGN KEY ("scriptId") REFERENCES "Script"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ShootingPlan"
  ADD CONSTRAINT "ShootingPlan_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ShootingPlan"
  ADD CONSTRAINT "ShootingPlan_scriptId_fkey"
  FOREIGN KEY ("scriptId") REFERENCES "Script"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TaskSuggestion"
  ADD CONSTRAINT "TaskSuggestion_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TaskSuggestion"
  ADD CONSTRAINT "TaskSuggestion_scriptId_fkey"
  FOREIGN KEY ("scriptId") REFERENCES "Script"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "TaskSuggestion"
  ADD CONSTRAINT "TaskSuggestion_shootingPlanId_fkey"
  FOREIGN KEY ("shootingPlanId") REFERENCES "ShootingPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "LlmRun"
  ADD CONSTRAINT "LlmRun_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "LlmRun"
  ADD CONSTRAINT "LlmRun_scriptId_fkey"
  FOREIGN KEY ("scriptId") REFERENCES "Script"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "BackgroundJob_projectId_status_idx" ON "BackgroundJob"("projectId", "status");
CREATE INDEX "BackgroundJob_scriptId_idx" ON "BackgroundJob"("scriptId");
CREATE INDEX "ShootingPlan_projectId_idx" ON "ShootingPlan"("projectId");
CREATE INDEX "ShootingPlan_scriptId_idx" ON "ShootingPlan"("scriptId");
CREATE INDEX "TaskSuggestion_projectId_status_idx" ON "TaskSuggestion"("projectId", "status");
CREATE INDEX "TaskSuggestion_scriptId_idx" ON "TaskSuggestion"("scriptId");
CREATE INDEX "LlmRun_projectId_createdAt_idx" ON "LlmRun"("projectId", "createdAt");
CREATE INDEX "LlmRun_scriptId_createdAt_idx" ON "LlmRun"("scriptId", "createdAt");
