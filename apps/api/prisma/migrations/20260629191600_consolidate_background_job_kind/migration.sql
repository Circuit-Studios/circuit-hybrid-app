-- Consolidate duplicate BackgroundJobKind values: SCRIPT_ANALYSIS and
-- SHOOTING_PLAN drove the identical pipeline. Re-map any legacy rows to the
-- single surviving kind, then drop the unused enum value.

-- Re-map legacy rows first so the enum cast below cannot fail.
UPDATE "BackgroundJob" SET "kind" = 'SHOOTING_PLAN' WHERE "kind" = 'SCRIPT_ANALYSIS';

-- AlterEnum
BEGIN;
CREATE TYPE "BackgroundJobKind_new" AS ENUM ('SHOOTING_PLAN');
ALTER TABLE "BackgroundJob" ALTER COLUMN "kind" TYPE "BackgroundJobKind_new" USING ("kind"::text::"BackgroundJobKind_new");
ALTER TYPE "BackgroundJobKind" RENAME TO "BackgroundJobKind_old";
ALTER TYPE "BackgroundJobKind_new" RENAME TO "BackgroundJobKind";
DROP TYPE "BackgroundJobKind_old";
COMMIT;
