import type { OtpSession } from '@/auth/OtpSessionContext';
import { isValidPassword } from '@/lib/password';
import { isSessionExpired } from '@/lib/session';

export type OtpSessionIssue =
  | 'missing'
  | 'missing_channel'
  | 'missing_destination'
  | 'expired'
  | 'incomplete_signup';

export type OtpSessionValidation =
  | { ok: true; session: OtpSession }
  | { ok: false; issue: OtpSessionIssue };

/** Reject stale or partial OTP session state before verify/resend. */
export function validateOtpSession(session: OtpSession | null | undefined): OtpSessionValidation {
  if (!session) {
    return { ok: false, issue: 'missing' };
  }

  if (session.channel !== 'EMAIL' && session.channel !== 'PHONE') {
    return { ok: false, issue: 'missing_channel' };
  }

  const destination = session.channel === 'EMAIL' ? session.email?.trim() : session.phone?.trim();
  if (!destination) {
    return { ok: false, issue: 'missing_destination' };
  }

  if (isSessionExpired(session.expiresAtMs)) {
    return { ok: false, issue: 'expired' };
  }

  if (session.mode === 'signup') {
    const hasName = Boolean(session.firstName?.trim());
    const hasRole = Boolean(session.role);
    const hasPassword = isValidPassword(session.password ?? '');
    if (!hasName || !hasRole || !hasPassword) {
      return { ok: false, issue: 'incomplete_signup' };
    }
  }

  return { ok: true, session };
}
