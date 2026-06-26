-- Team on-set status for the mobile Team tab.
CREATE TYPE "SetStatus" AS ENUM ('ON_SET', 'EN_ROUTE', 'DONE', 'OFF');

ALTER TABLE "ProjectMember"
  ADD COLUMN "setStatus" "SetStatus" NOT NULL DEFAULT 'OFF',
  ADD COLUMN "setStatusNote" TEXT,
  ADD COLUMN "setStatusUpdatedAt" TIMESTAMP(3);
