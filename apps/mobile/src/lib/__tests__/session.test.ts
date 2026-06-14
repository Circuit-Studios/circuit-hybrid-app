import {
  formatRemainingSession,
  IDLE_TIMEOUT_MS,
  isIdleSessionExpired,
  isSessionExpired,
  OTP_TTL_MS,
  readJwtExpiresAtMs,
  resolveSessionExpiresAtMs,
} from '@/lib/session';

describe('session expiry', () => {
  function encodeBase64Url(value: string): string {
    return btoa(value).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  function makeToken(expSeconds: number): string {
    const header = encodeBase64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payload = encodeBase64Url(JSON.stringify({ exp: expSeconds }));
    return `${header}.${payload}.sig`;
  }

  it('reads exp from JWT payload', () => {
    const exp = Math.floor(Date.now() / 1000) + 300;
    expect(readJwtExpiresAtMs(makeToken(exp))).toBe(exp * 1000);
  });

  it('detects expired JWT sessions', () => {
    expect(isSessionExpired(Date.now() - 1)).toBe(true);
    expect(isSessionExpired(Date.now() + 60_000)).toBe(false);
  });

  it('detects idle timeout', () => {
    const lastActivity = Date.now() - IDLE_TIMEOUT_MS - 1;
    expect(isIdleSessionExpired(lastActivity)).toBe(true);
    expect(isIdleSessionExpired(Date.now())).toBe(false);
  });

  it('prefers API expiresAt over JWT exp', () => {
    const iso = new Date(Date.now() + 120_000).toISOString();
    const token = makeToken(Math.floor(Date.now() / 1000) + 30);
    expect(resolveSessionExpiresAtMs(iso, token)).toBe(Date.parse(iso));
  });

  it('falls back to JWT exp when expiresAt is missing', () => {
    const exp = Math.floor(Date.now() / 1000) + 90;
    const token = makeToken(exp);
    expect(resolveSessionExpiresAtMs(undefined, token)).toBe(exp * 1000);
  });

  it('formats remaining time', () => {
    expect(formatRemainingSession(305)).toBe('5:05');
    expect(formatRemainingSession(42)).toBe('42s');
  });

  it('uses OTP and idle constants', () => {
    expect(OTP_TTL_MS).toBe(5 * 60 * 1000);
    expect(IDLE_TIMEOUT_MS).toBe(3 * 60 * 1000);
  });
});
