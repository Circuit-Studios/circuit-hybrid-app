-- Email OTP verification table + user email_verified flag
ALTER TABLE "User" ADD COLUMN "emailVerified" BOOLEAN NOT NULL DEFAULT false;

CREATE TYPE "EmailOtpPurpose" AS ENUM ('SIGNUP', 'LOGIN', 'VERIFY_EMAIL');

CREATE TABLE "email_otps" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "otp_hash" TEXT NOT NULL,
    "purpose" "EmailOtpPurpose" NOT NULL DEFAULT 'VERIFY_EMAIL',
    "expires_at" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "consumed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_otps_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "email_otps_email_purpose_consumed_at_idx" ON "email_otps"("email", "purpose", "consumed_at");
CREATE INDEX "email_otps_expires_at_idx" ON "email_otps"("expires_at");
