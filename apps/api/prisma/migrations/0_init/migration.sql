-- CreateEnum
CREATE TYPE "PushPlatform" AS ENUM ('IOS', 'ANDROID', 'WEB');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('DIRECTOR', 'PRODUCER', 'EXECUTIVE_PRODUCER', 'LINE_PRODUCER', 'AD', 'DOP', 'DEPT_HEAD', 'CREW', 'ACTOR', 'VENDOR');

-- CreateEnum
CREATE TYPE "OtpChannel" AS ENUM ('PHONE', 'EMAIL');

-- CreateEnum
CREATE TYPE "OtpPurpose" AS ENUM ('SIGNUP', 'LOGIN', 'VERIFY_EMAIL', 'PASSWORD_RESET');

-- CreateEnum
CREATE TYPE "ProjectStage" AS ENUM ('PRE_PRODUCTION', 'PRODUCTION', 'POST_PRODUCTION');

-- CreateEnum
CREATE TYPE "ProjectLanguage" AS ENUM ('TELUGU', 'HINDI', 'TAMIL', 'MALAYALAM', 'KANNADA', 'ENGLISH', 'OTHER');

-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('INVITED', 'ACTIVE', 'REMOVED');

-- CreateEnum
CREATE TYPE "SetStatus" AS ENUM ('ON_SET', 'EN_ROUTE', 'DONE', 'OFF');

-- CreateEnum
CREATE TYPE "ScriptAnalysisStatus" AS ENUM ('PENDING', 'EXTRACTING_TEXT', 'ANALYZING_CHARACTERS', 'ANALYZING_SCENES', 'ANALYZING_COMBINATIONS', 'SUGGESTING_DEPARTMENTS', 'ESTIMATING_SHOOT_DAYS', 'DRAFTING_BUDGET', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "CharacterImportance" AS ENUM ('LEAD', 'SUPPORT', 'DAY_ROLE');

-- CreateEnum
CREATE TYPE "SceneLocationType" AS ENUM ('INTERIOR', 'EXTERIOR', 'INT_EXT');

-- CreateEnum
CREATE TYPE "SceneTimeOfDay" AS ENUM ('DAY', 'NIGHT', 'DAWN', 'DUSK', 'UNSPECIFIED');

-- CreateEnum
CREATE TYPE "DepartmentKind" AS ENUM ('DIRECTION', 'PRODUCTION', 'CASTING', 'DOP_CAMERA', 'ART', 'COSTUME', 'MAKEUP_HAIR', 'STUNTS', 'VFX', 'SOUND', 'MUSIC', 'LOCATION', 'EDITORIAL', 'POST_DI', 'POST_SOUND', 'OTHER');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'DONE', 'BLOCKED');

-- CreateEnum
CREATE TYPE "TaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "ConflictKind" AS ENUM ('SCHEDULE_CLASH', 'DEPT_BEHIND', 'MISSING_DEPENDENCY');

-- CreateEnum
CREATE TYPE "ConflictSeverity" AS ENUM ('INFO', 'WARNING', 'CRITICAL');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('PUSH', 'SMS', 'IN_APP');

-- CreateEnum
CREATE TYPE "NotificationKind" AS ENUM ('CONFLICT_ALERT', 'TASK_ASSIGNED', 'TASK_DUE_SOON', 'SHOOT_DAY_UPDATED', 'SHOOT_DAY_CALL', 'PROJECT_INVITE', 'AI_ANALYSIS_DONE', 'GENERIC');

-- CreateEnum
CREATE TYPE "BackgroundJobStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED');

-- CreateEnum
CREATE TYPE "BackgroundJobKind" AS ENUM ('SCRIPT_ANALYSIS', 'SHOOTING_PLAN');

-- CreateEnum
CREATE TYPE "TaskSuggestionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CONVERTED');

-- CreateEnum
CREATE TYPE "LlmRunStatus" AS ENUM ('SUCCEEDED', 'FAILED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "defaultRole" "UserRole" NOT NULL DEFAULT 'CREW',
    "passwordHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PushToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "platform" "PushPlatform" NOT NULL,
    "deviceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PushToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthOtp" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "channel" "OtpChannel" NOT NULL DEFAULT 'PHONE',
    "target" TEXT NOT NULL,
    "purpose" "OtpPurpose" NOT NULL DEFAULT 'LOGIN',
    "codeHash" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuthOtp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feature_flags" (
    "key" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "configJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "feature_flags_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "language" "ProjectLanguage" NOT NULL DEFAULT 'TELUGU',
    "languages" "ProjectLanguage"[] DEFAULT ARRAY[]::"ProjectLanguage"[],
    "genre" TEXT NOT NULL,
    "budgetMinINR" BIGINT,
    "budgetMaxINR" BIGINT,
    "shootStartDate" TIMESTAMP(3),
    "shootEndDate" TIMESTAMP(3),
    "currentStage" "ProjectStage" NOT NULL DEFAULT 'PRE_PRODUCTION',
    "ownerUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectMember" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "userId" TEXT,
    "inviteePhone" TEXT,
    "inviteeEmail" TEXT,
    "inviteeName" TEXT,
    "role" "UserRole" NOT NULL,
    "projectDepartmentId" TEXT,
    "status" "MembershipStatus" NOT NULL DEFAULT 'INVITED',
    "setStatus" "SetStatus" NOT NULL DEFAULT 'OFF',
    "setStatusNote" TEXT,
    "setStatusUpdatedAt" TIMESTAMP(3),
    "invitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedAt" TIMESTAMP(3),

    CONSTRAINT "ProjectMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Script" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "uploadedByUserId" TEXT NOT NULL,
    "originalFileName" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" BIGINT NOT NULL,
    "pageCount" INTEGER,
    "rawText" TEXT,
    "language" TEXT,
    "analysisStatus" "ScriptAnalysisStatus" NOT NULL DEFAULT 'PENDING',
    "analysisError" TEXT,
    "analysisStartedAt" TIMESTAMP(3),
    "analysisEndedAt" TIMESTAMP(3),
    "aiSummary" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Script_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Character" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "importance" "CharacterImportance" NOT NULL DEFAULT 'SUPPORT',
    "estimatedScreenTimeMinutes" INTEGER,
    "estimatedShootDays" INTEGER,
    "castUserId" TEXT,
    "notes" TEXT,
    "isEdited" BOOLEAN NOT NULL DEFAULT false,
    "editedByUserId" TEXT,
    "editedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Character_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Scene" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "sceneNumber" TEXT NOT NULL,
    "heading" TEXT,
    "synopsis" TEXT,
    "locationType" "SceneLocationType" NOT NULL DEFAULT 'INTERIOR',
    "timeOfDay" "SceneTimeOfDay" NOT NULL DEFAULT 'UNSPECIFIED',
    "locationName" TEXT,
    "estimatedPages" DOUBLE PRECISION,
    "estimatedShootHours" DOUBLE PRECISION,
    "hasStunts" BOOLEAN NOT NULL DEFAULT false,
    "hasVFX" BOOLEAN NOT NULL DEFAULT false,
    "hasSong" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL,
    "isEdited" BOOLEAN NOT NULL DEFAULT false,
    "editedByUserId" TEXT,
    "editedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Scene_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SceneAppearance" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "sceneId" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,

    CONSTRAINT "SceneAppearance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectDepartment" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "kind" "DepartmentKind" NOT NULL,
    "displayName" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "isEdited" BOOLEAN NOT NULL DEFAULT false,
    "editedByUserId" TEXT,
    "editedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectDepartment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "TaskStatus" NOT NULL DEFAULT 'TODO',
    "priority" "TaskPriority" NOT NULL DEFAULT 'MEDIUM',
    "dueDate" TIMESTAMP(3),
    "characterId" TEXT,
    "sceneId" TEXT,
    "shootDayId" TEXT,
    "assigneeUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShootDay" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "dayNumber" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "location" TEXT,
    "callTimeUserId" TEXT,
    "notes" TEXT,

    CONSTRAINT "ShootDay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShootDayScene" (
    "shootDayId" TEXT NOT NULL,
    "sceneId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ShootDayScene_pkey" PRIMARY KEY ("shootDayId","sceneId")
);

-- CreateTable
CREATE TABLE "ShootDayCall" (
    "id" TEXT NOT NULL,
    "shootDayId" TEXT NOT NULL,
    "projectMemberId" TEXT NOT NULL,
    "callTime" TIMESTAMP(3),

    CONSTRAINT "ShootDayCall_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConflictAlert" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "kind" "ConflictKind" NOT NULL,
    "severity" "ConflictSeverity" NOT NULL DEFAULT 'WARNING',
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "contextJson" JSONB,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConflictAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BudgetLine" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "department" "DepartmentKind" NOT NULL,
    "label" TEXT NOT NULL,
    "amountINR" BIGINT NOT NULL,
    "isAIDraft" BOOLEAN NOT NULL DEFAULT true,
    "isEdited" BOOLEAN NOT NULL DEFAULT false,
    "editedByUserId" TEXT,
    "editedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BudgetLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "channel" "NotificationChannel" NOT NULL DEFAULT 'IN_APP',
    "kind" "NotificationKind" NOT NULL DEFAULT 'GENERIC',
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "deepLink" TEXT,
    "projectId" TEXT,
    "contextJson" JSONB,
    "readAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "pushTicketId" TEXT,
    "pushError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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

-- CreateTable
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
    "rationale" TEXT,
    "confidence" DOUBLE PRECISION,
    "estimatedDueOffsetDays" INTEGER,
    "status" "TaskSuggestionStatus" NOT NULL DEFAULT 'PENDING',
    "convertedTaskId" TEXT,
    "reviewedByUserId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaskSuggestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShootingPlan" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "scriptId" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "totalShootDays" INTEGER NOT NULL,
    "assumptions" JSONB,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "risks" JSONB NOT NULL,
    "plan" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShootingPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LlmRun" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "stage" TEXT NOT NULL,
    "projectId" TEXT,
    "scriptId" TEXT,
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "totalTokens" INTEGER,
    "durationMs" INTEGER NOT NULL,
    "status" "LlmRunStatus" NOT NULL,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LlmRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "PushToken_token_key" ON "PushToken"("token");

-- CreateIndex
CREATE INDEX "PushToken_userId_idx" ON "PushToken"("userId");

-- CreateIndex
CREATE INDEX "PushToken_deviceId_idx" ON "PushToken"("deviceId");

-- CreateIndex
CREATE INDEX "AuthOtp_channel_target_purpose_consumedAt_idx" ON "AuthOtp"("channel", "target", "purpose", "consumedAt");

-- CreateIndex
CREATE INDEX "AuthOtp_expiresAt_idx" ON "AuthOtp"("expiresAt");

-- CreateIndex
CREATE INDEX "Project_ownerUserId_idx" ON "Project"("ownerUserId");

-- CreateIndex
CREATE INDEX "ProjectMember_userId_idx" ON "ProjectMember"("userId");

-- CreateIndex
CREATE INDEX "ProjectMember_projectId_idx" ON "ProjectMember"("projectId");

-- CreateIndex
CREATE INDEX "ProjectMember_inviteePhone_idx" ON "ProjectMember"("inviteePhone");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectMember_projectId_userId_role_key" ON "ProjectMember"("projectId", "userId", "role");

-- CreateIndex
CREATE INDEX "Script_projectId_idx" ON "Script"("projectId");

-- CreateIndex
CREATE INDEX "Character_projectId_idx" ON "Character"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "Character_projectId_name_key" ON "Character"("projectId", "name");

-- CreateIndex
CREATE INDEX "Scene_projectId_order_idx" ON "Scene"("projectId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "Scene_projectId_sceneNumber_key" ON "Scene"("projectId", "sceneNumber");

-- CreateIndex
CREATE INDEX "SceneAppearance_projectId_characterId_idx" ON "SceneAppearance"("projectId", "characterId");

-- CreateIndex
CREATE UNIQUE INDEX "SceneAppearance_sceneId_characterId_key" ON "SceneAppearance"("sceneId", "characterId");

-- CreateIndex
CREATE INDEX "ProjectDepartment_projectId_idx" ON "ProjectDepartment"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectDepartment_projectId_kind_key" ON "ProjectDepartment"("projectId", "kind");

-- CreateIndex
CREATE INDEX "Task_projectId_status_idx" ON "Task"("projectId", "status");

-- CreateIndex
CREATE INDEX "Task_departmentId_status_idx" ON "Task"("departmentId", "status");

-- CreateIndex
CREATE INDEX "ShootDay_date_idx" ON "ShootDay"("date");

-- CreateIndex
CREATE UNIQUE INDEX "ShootDay_projectId_dayNumber_key" ON "ShootDay"("projectId", "dayNumber");

-- CreateIndex
CREATE UNIQUE INDEX "ShootDay_projectId_date_key" ON "ShootDay"("projectId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "ShootDayCall_shootDayId_projectMemberId_key" ON "ShootDayCall"("shootDayId", "projectMemberId");

-- CreateIndex
CREATE INDEX "ConflictAlert_projectId_resolved_idx" ON "ConflictAlert"("projectId", "resolved");

-- CreateIndex
CREATE INDEX "ConflictAlert_projectId_kind_idx" ON "ConflictAlert"("projectId", "kind");

-- CreateIndex
CREATE INDEX "BudgetLine_projectId_department_idx" ON "BudgetLine"("projectId", "department");

-- CreateIndex
CREATE INDEX "Notification_userId_readAt_idx" ON "Notification"("userId", "readAt");

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_projectId_idx" ON "Notification"("projectId");

-- CreateIndex
CREATE INDEX "BackgroundJob_projectId_status_idx" ON "BackgroundJob"("projectId", "status");

-- CreateIndex
CREATE INDEX "BackgroundJob_scriptId_idx" ON "BackgroundJob"("scriptId");

-- CreateIndex
CREATE INDEX "TaskSuggestion_projectId_status_idx" ON "TaskSuggestion"("projectId", "status");

-- CreateIndex
CREATE INDEX "TaskSuggestion_scriptId_idx" ON "TaskSuggestion"("scriptId");

-- CreateIndex
CREATE INDEX "ShootingPlan_projectId_idx" ON "ShootingPlan"("projectId");

-- CreateIndex
CREATE INDEX "ShootingPlan_scriptId_idx" ON "ShootingPlan"("scriptId");

-- CreateIndex
CREATE INDEX "LlmRun_projectId_createdAt_idx" ON "LlmRun"("projectId", "createdAt");

-- CreateIndex
CREATE INDEX "LlmRun_scriptId_createdAt_idx" ON "LlmRun"("scriptId", "createdAt");

-- CreateIndex
CREATE INDEX "LlmRun_provider_model_createdAt_idx" ON "LlmRun"("provider", "model", "createdAt");

-- AddForeignKey
ALTER TABLE "PushToken" ADD CONSTRAINT "PushToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthOtp" ADD CONSTRAINT "AuthOtp_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectMember" ADD CONSTRAINT "ProjectMember_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectMember" ADD CONSTRAINT "ProjectMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectMember" ADD CONSTRAINT "ProjectMember_projectDepartmentId_fkey" FOREIGN KEY ("projectDepartmentId") REFERENCES "ProjectDepartment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Script" ADD CONSTRAINT "Script_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Script" ADD CONSTRAINT "Script_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Character" ADD CONSTRAINT "Character_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Scene" ADD CONSTRAINT "Scene_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SceneAppearance" ADD CONSTRAINT "SceneAppearance_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SceneAppearance" ADD CONSTRAINT "SceneAppearance_sceneId_fkey" FOREIGN KEY ("sceneId") REFERENCES "Scene"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SceneAppearance" ADD CONSTRAINT "SceneAppearance_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectDepartment" ADD CONSTRAINT "ProjectDepartment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "ProjectDepartment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShootDay" ADD CONSTRAINT "ShootDay_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShootDay" ADD CONSTRAINT "ShootDay_callTimeUserId_fkey" FOREIGN KEY ("callTimeUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShootDayScene" ADD CONSTRAINT "ShootDayScene_shootDayId_fkey" FOREIGN KEY ("shootDayId") REFERENCES "ShootDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShootDayScene" ADD CONSTRAINT "ShootDayScene_sceneId_fkey" FOREIGN KEY ("sceneId") REFERENCES "Scene"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShootDayCall" ADD CONSTRAINT "ShootDayCall_shootDayId_fkey" FOREIGN KEY ("shootDayId") REFERENCES "ShootDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShootDayCall" ADD CONSTRAINT "ShootDayCall_projectMemberId_fkey" FOREIGN KEY ("projectMemberId") REFERENCES "ProjectMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConflictAlert" ADD CONSTRAINT "ConflictAlert_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetLine" ADD CONSTRAINT "BudgetLine_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BackgroundJob" ADD CONSTRAINT "BackgroundJob_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BackgroundJob" ADD CONSTRAINT "BackgroundJob_scriptId_fkey" FOREIGN KEY ("scriptId") REFERENCES "Script"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskSuggestion" ADD CONSTRAINT "TaskSuggestion_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskSuggestion" ADD CONSTRAINT "TaskSuggestion_scriptId_fkey" FOREIGN KEY ("scriptId") REFERENCES "Script"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskSuggestion" ADD CONSTRAINT "TaskSuggestion_shootingPlanId_fkey" FOREIGN KEY ("shootingPlanId") REFERENCES "ShootingPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShootingPlan" ADD CONSTRAINT "ShootingPlan_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShootingPlan" ADD CONSTRAINT "ShootingPlan_scriptId_fkey" FOREIGN KEY ("scriptId") REFERENCES "Script"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LlmRun" ADD CONSTRAINT "LlmRun_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LlmRun" ADD CONSTRAINT "LlmRun_scriptId_fkey" FOREIGN KEY ("scriptId") REFERENCES "Script"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Seed default feature flags (selectable in DB; code falls back to enabled when a row is missing).
INSERT INTO "feature_flags" ("key", "enabled", "updatedAt") VALUES
  ('scripts.upload', true, CURRENT_TIMESTAMP),
  ('scripts.shootingPlan', true, CURRENT_TIMESTAMP),
  ('scripts.taskSuggestions', true, CURRENT_TIMESTAMP),
  ('team.invites', true, CURRENT_TIMESTAMP),
  ('auth.emailOtp', true, CURRENT_TIMESTAMP),
  ('auth.phoneOtp', true, CURRENT_TIMESTAMP),
  ('notifications.push', true, CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;
