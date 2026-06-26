import { OtpPurpose } from '@prisma/client';

export type OtpFlowPurpose = 'signup' | 'login' | 'verify_email' | 'password_reset';

export function toOtpPurpose(purpose?: string): OtpPurpose {
  switch (purpose?.toLowerCase()) {
    case 'signup':
      return OtpPurpose.SIGNUP;
    case 'login':
      return OtpPurpose.LOGIN;
    case 'password_reset':
    case 'password-reset':
      return OtpPurpose.PASSWORD_RESET;
    case 'verify_email':
    case 'verify-email':
      return OtpPurpose.VERIFY_EMAIL;
    default:
      return OtpPurpose.VERIFY_EMAIL;
  }
}

/**
 * Single mapping from API flow purpose to the stored OtpPurpose. Defaults to LOGIN.
 * Used by signup/login/verify_email/password_reset flows.
 */
export function flowPurposeToOtpPurpose(purpose?: OtpFlowPurpose): OtpPurpose {
  switch (purpose) {
    case 'signup':
      return OtpPurpose.SIGNUP;
    case 'verify_email':
      return OtpPurpose.VERIFY_EMAIL;
    case 'password_reset':
      return OtpPurpose.PASSWORD_RESET;
    case 'login':
    default:
      return OtpPurpose.LOGIN;
  }
}

export function purposeToApiLabel(purpose: OtpPurpose): string {
  switch (purpose) {
    case OtpPurpose.SIGNUP:
      return 'signup';
    case OtpPurpose.LOGIN:
      return 'login';
    case OtpPurpose.PASSWORD_RESET:
      return 'password_reset';
    default:
      return 'verify_email';
  }
}

export function toOtpDeliveryPurpose(purpose: OtpPurpose): 'signup' | 'login' {
  return purpose === OtpPurpose.LOGIN ? 'login' : 'signup';
}
