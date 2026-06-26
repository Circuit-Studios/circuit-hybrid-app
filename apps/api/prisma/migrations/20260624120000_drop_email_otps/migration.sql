-- Drop legacy email_otps table; all OTP rows live in AuthOtp.

DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'email_otps') THEN
    INSERT INTO "AuthOtp" (
      "id",
      "channel",
      "target",
      "purpose",
      "codeHash",
      "attempts",
      "expiresAt",
      "consumedAt",
      "consumed",
      "createdAt"
    )
    SELECT
      "id",
      'EMAIL'::"OtpChannel",
      "email",
      "purpose",
      "otp_hash",
      "attempts",
      "expires_at",
      "consumed_at",
      ("consumed_at" IS NOT NULL),
      "created_at"
    FROM "email_otps"
    ON CONFLICT ("id") DO NOTHING;

    DROP TABLE "email_otps";
  END IF;
END $$;

DROP INDEX IF EXISTS "AuthOtp_phone_consumed_idx";
DROP INDEX IF EXISTS "AuthOtp_channel_target_consumed_idx";
