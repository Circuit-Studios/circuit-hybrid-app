-- Auth OTP: channel + target (supports phone and email delivery)
CREATE TYPE "OtpChannel" AS ENUM ('PHONE', 'EMAIL');

ALTER TABLE "AuthOtp" ADD COLUMN "channel" "OtpChannel" NOT NULL DEFAULT 'EMAIL';
ALTER TABLE "AuthOtp" ADD COLUMN "target" TEXT;

UPDATE "AuthOtp" SET "target" = "email" WHERE "target" IS NULL;

ALTER TABLE "AuthOtp" ALTER COLUMN "target" SET NOT NULL;

DROP INDEX IF EXISTS "AuthOtp_email_consumed_idx";
ALTER TABLE "AuthOtp" DROP COLUMN "email";

CREATE INDEX "AuthOtp_channel_target_consumed_idx" ON "AuthOtp"("channel", "target", "consumed");
