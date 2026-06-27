-- Canonical AuthOtp fields: target + consumedAt (drop legacy phone/consumed).

UPDATE "AuthOtp"
SET "target" = "phone"
WHERE "target" IS NULL AND "phone" IS NOT NULL;

UPDATE "AuthOtp"
SET "consumedAt" = COALESCE("consumedAt", "createdAt")
WHERE "consumed" = true AND "consumedAt" IS NULL;

DELETE FROM "AuthOtp" WHERE "target" IS NULL;

ALTER TABLE "AuthOtp" ALTER COLUMN "target" SET NOT NULL;

DROP INDEX IF EXISTS "AuthOtp_phone_consumed_idx";
DROP INDEX IF EXISTS "AuthOtp_channel_target_consumed_idx";
DROP INDEX IF EXISTS "AuthOtp_email_consumed_idx";

ALTER TABLE "AuthOtp" DROP COLUMN IF EXISTS "phone";
ALTER TABLE "AuthOtp" DROP COLUMN IF EXISTS "consumed";
