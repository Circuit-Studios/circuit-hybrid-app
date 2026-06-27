import type { Env } from './env.js';

export function assertResendEmailOtpConfig(config: Env): void {
  if (config.EMAIL_OTP_PROVIDER !== 'RESEND') return;

  const missing: string[] = [];
  if (!config.RESEND_API_KEY) missing.push('RESEND_API_KEY');
  if (!config.RESEND_OTP_TEMPLATE_ID) missing.push('RESEND_OTP_TEMPLATE_ID');

  if (missing.length > 0) {
    console.error(
      `EMAIL_OTP_PROVIDER=RESEND requires ${missing.join(' and ')}. ` +
        'Set them in Render Environment or apps/api/.env.development for local testing.',
    );
    process.exit(1);
  }
}

export function assertProductionOtpProviders(config: Env): void {
  if (config.APP_ENV !== 'prod' || config.ALLOW_MOCK_OTP_IN_PROD) return;

  const signupChannel = config.SIGNUP_VERIFICATION_CHANNEL;
  const mockSignup =
    (signupChannel === 'EMAIL' && config.EMAIL_OTP_PROVIDER === 'MOCK') ||
    (signupChannel === 'PHONE' && config.PHONE_OTP_PROVIDER === 'MOCK');

  if (mockSignup) {
    console.error(
      `APP_ENV=prod cannot start with MOCK OTP for SIGNUP_VERIFICATION_CHANNEL=${signupChannel}. ` +
        'Set a real provider or ALLOW_MOCK_OTP_IN_PROD=true for emergency testing only.',
    );
    process.exit(1);
  }
}

/** Direct register must never be enabled in production — remove route before App Store. */
export function assertProductionDirectRegisterDisabled(config: Env): void {
  if (config.APP_ENV === 'prod' && config.ALLOW_DIRECT_REGISTER) {
    console.error('APP_ENV=prod cannot start with ALLOW_DIRECT_REGISTER=true.');
    process.exit(1);
  }
}
