import { OtpPurpose } from '@prisma/client';

export type OtpFlowPurpose = 'signup' | 'login' | 'verify_email';

export function toOtpPurpose(purpose?: string): OtpPurpose {
  switch (purpose?.toLowerCase()) {
    case 'signup':
      return OtpPurpose.SIGNUP;
    case 'login':
      return OtpPurpose.LOGIN;
    case 'verify_email':
    case 'verify-email':
      return OtpPurpose.VERIFY_EMAIL;
    default:
      return OtpPurpose.VERIFY_EMAIL;
  }
}

/** Auth signup/login flows default to LOGIN when purpose is omitted. */
export function toAuthOtpPurpose(purpose?: 'signup' | 'login'): OtpPurpose {
  return purpose === 'signup' ? OtpPurpose.SIGNUP : OtpPurpose.LOGIN;
}

export function purposeToApiLabel(purpose: OtpPurpose): string {
  switch (purpose) {
    case OtpPurpose.SIGNUP:
      return 'signup';
    case OtpPurpose.LOGIN:
      return 'login';
    default:
      return 'verify_email';
  }
}

export function toOtpDeliveryPurpose(purpose: OtpPurpose): 'signup' | 'login' {
  return purpose === OtpPurpose.LOGIN ? 'login' : 'signup';
}
