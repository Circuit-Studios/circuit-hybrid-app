-- Unified OTP storage on AuthOtp (additive — no column drops)

ALTER TYPE "EmailOtpPurpose" RENAME TO "OtpPurpose";

ALTER TABLE "AuthOtp" ADD COLUMN "purpose" "OtpPurpose" NOT NULL DEFAULT 'LOGIN';
ALTER TABLE "AuthOtp" ADD COLUMN "attempts" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "AuthOtp" ADD COLUMN "consumedAt" TIMESTAMP(3);

UPDATE "AuthOtp"
SET "consumedAt" = "createdAt"
WHERE "consumed" = true AND "consumedAt" IS NULL;

CREATE INDEX "AuthOtp_channel_target_purpose_consumedAt_idx"
  ON "AuthOtp"("channel", "target", "purpose", "consumedAt");
