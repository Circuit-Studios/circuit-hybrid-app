-- Feature flags + AuthOtp backward-compatible phone column

CREATE TABLE "feature_flags" (
    "key" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "configJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "feature_flags_pkey" PRIMARY KEY ("key")
);

INSERT INTO "feature_flags" ("key", "enabled", "updatedAt") VALUES
  ('scripts.upload', true, CURRENT_TIMESTAMP),
  ('scripts.aiAnalysis', true, CURRENT_TIMESTAMP),
  ('team.invites', true, CURRENT_TIMESTAMP),
  ('auth.emailOtp', true, CURRENT_TIMESTAMP),
  ('auth.phoneOtp', true, CURRENT_TIMESTAMP),
  ('notifications.push', true, CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;

ALTER TABLE "AuthOtp" ADD COLUMN "phone" TEXT;

UPDATE "AuthOtp" SET "phone" = "target" WHERE "channel" = 'PHONE' AND "phone" IS NULL;

ALTER TABLE "AuthOtp" ALTER COLUMN "target" DROP NOT NULL;

ALTER TABLE "AuthOtp" ALTER COLUMN "channel" SET DEFAULT 'PHONE';

CREATE INDEX "AuthOtp_phone_consumed_idx" ON "AuthOtp"("phone", "consumed");
