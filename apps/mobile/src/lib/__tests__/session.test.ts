import {
  IDLE_TIMEOUT_MS,
  isIdleSessionExpired,
  isScriptAnalysisInProgress,
  isSessionExpired,
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

  it('detects in-progress script analysis', () => {
    expect(isScriptAnalysisInProgress('ANALYZING_SCENES')).toBe(true);
    expect(isScriptAnalysisInProgress('COMPLETED')).toBe(false);
    expect(isScriptAnalysisInProgress(undefined)).toBe(false);
  });

  it('resolves session expiry from API expiresAt or JWT exp', () => {
    const iso = new Date(Date.now() + 120_000).toISOString();
    const shortToken = makeToken(Math.floor(Date.now() / 1000) + 30);
    expect(resolveSessionExpiresAtMs(iso, shortToken)).toBe(Date.parse(iso));

    const exp = Math.floor(Date.now() / 1000) + 90;
    expect(resolveSessionExpiresAtMs(undefined, makeToken(exp))).toBe(exp * 1000);
  });
});
