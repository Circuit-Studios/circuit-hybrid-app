import { readApiError, shouldSignOutOn401 } from '@/api/client';

describe('readApiError', () => {
  it('returns fallback for unknown errors', () => {
    expect(readApiError(null, 'fallback')).toBe('fallback');
  });

  it('returns Error message', () => {
    expect(readApiError(new Error('boom'), 'fallback')).toBe('boom');
  });
});

describe('shouldSignOutOn401', () => {
  it('does not sign out for login failures without auth header', () => {
    expect(
      shouldSignOutOn401({
        url: '/auth/login',
        headers: {},
      } as never),
    ).toBe(false);
  });

  it('does not sign out for public auth paths even with auth header', () => {
    expect(
      shouldSignOutOn401({
        url: '/auth/verify-otp',
        headers: { Authorization: 'Bearer stale' },
      } as never),
    ).toBe(false);
  });

  it('signs out for protected routes with auth header', () => {
    expect(
      shouldSignOutOn401({
        url: '/auth/me',
        headers: { Authorization: 'Bearer stale' },
      } as never),
    ).toBe(true);
  });
});
