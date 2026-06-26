-- Add PASSWORD_RESET to OtpPurpose enum (additive — no data migration)
ALTER TYPE "OtpPurpose" ADD VALUE IF NOT EXISTS 'PASSWORD_RESET';
