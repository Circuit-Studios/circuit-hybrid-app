-- Auth OTP: phone → email (email-first authentication)
ALTER TABLE "AuthOtp" RENAME COLUMN "phone" TO "email";

DROP INDEX IF EXISTS "AuthOtp_phone_consumed_idx";
CREATE INDEX "AuthOtp_email_consumed_idx" ON "AuthOtp"("email", "consumed");
