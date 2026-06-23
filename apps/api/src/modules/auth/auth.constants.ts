/** OTP verification codes expire after this many seconds. */
export const OTP_TTL_SECONDS = 5 * 60;

/** Cooldown between OTP resend requests (all channels). */
export const OTP_RESEND_COOLDOWN_SECONDS = 30;

/** Max failed verify attempts per issued OTP (email and phone). */
export const OTP_MAX_ATTEMPTS = 5;
