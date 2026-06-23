/** OTP verification codes expire after this many seconds. */
export const OTP_TTL_SECONDS = 5 * 60;

/** Cooldown between phone OTP resend requests. */
export const OTP_RESEND_COOLDOWN_SECONDS = 30;

/** Max failed verify attempts before an OTP is rejected. */
export const OTP_MAX_ATTEMPTS = 5;
