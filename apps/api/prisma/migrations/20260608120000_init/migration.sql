-- CreateEnum
CREATE TYPE "PushPlatform" AS ENUM ('IOS', 'ANDROID', 'WEB');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('DIRECTOR', 'PRODUCER', 'EXECUTIVE_PRODUCER', 'LINE_PRODUCER', 'AD', 'DOP', 'DEPT_HEAD', 'CREW', 'ACTOR', 'VENDOR');

-- CreateEnum
CREATE TYPE "ProjectStage" AS ENUM ('PRE_PRODUCTION', 'PRODUCTION', 'POST_PRODUCTION');

-- CreateEnum
CREATE TYPE "ProjectLanguage" AS ENUM ('TELUGU', 'HINDI', 'TAMIL', 'MALAYALAM', 'KANNADA', 'ENGLISH', 'OTHER');

-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('INVITED', 'ACTIVE', 'REMOVED');

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

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
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
    "phone" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuthOtp_pkey" PRIMARY KEY ("id")
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
CREATE INDEX "AuthOtp_phone_consumed_idx" ON "AuthOtp"("phone", "consumed");

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

