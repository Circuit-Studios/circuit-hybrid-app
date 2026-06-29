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

  it('rejects incomplete signup sessions', () => {
    const incomplete = {
      ...baseSession,
      mode: 'signup' as const,
      password: 'short',
      role: 'CREW' as const,
      firstName: 'Ada',
    };
    expect(validateOtpSession(incomplete)).toEqual({ ok: false, issue: 'incomplete_signup' });
    expect(validateOtpSession({ ...incomplete, password: '' })).toEqual({
      ok: false,
      issue: 'incomplete_signup',
    });
  });
});
