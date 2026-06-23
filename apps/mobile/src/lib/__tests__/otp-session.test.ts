import { describe, expect, it } from '@jest/globals';
import type { OtpSession } from '@/auth/OtpSessionContext';
import { validateOtpSession } from '@/lib/otp-session';

const baseSession: OtpSession = {
  channel: 'EMAIL',
  email: 'user@studio.com',
  mode: 'login',
  expiresAtMs: Date.now() + 60_000,
};

describe('validateOtpSession', () => {
  it('accepts a complete login session', () => {
    expect(validateOtpSession(baseSession)).toEqual({ ok: true, session: baseSession });
  });

  it('rejects missing destination for the channel', () => {
    expect(validateOtpSession({ ...baseSession, email: undefined })).toEqual({
      ok: false,
      issue: 'missing_destination',
    });
  });

  it('rejects incomplete signup session', () => {
    expect(
      validateOtpSession({
        ...baseSession,
        mode: 'signup',
        password: 'short',
        role: 'CREW',
        firstName: 'Ada',
      }),
    ).toEqual({ ok: false, issue: 'incomplete_signup' });
  });
});
