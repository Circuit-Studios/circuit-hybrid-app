import type { ScriptAnalysisStatus } from '@/api/types';

/** OTP signup verification window (server OTP_TTL_SECONDS). */
export const OTP_TTL_MS = 5 * 60 * 1000;

/** Sign out after this much time without user interaction (taps/gestures). */
export const IDLE_TIMEOUT_MS = 3 * 60 * 1000;

/** How often we re-check idle timeout while signed in. */
export const IDLE_CHECK_INTERVAL_MS = 15_000;

/** How often foreground tasks refresh last-activity while running. */
export const SESSION_KEEPALIVE_PULSE_MS = 30_000;

function decodeBase64Url(value: string): string {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
  if (typeof globalThis.atob !== 'function') {
    throw new Error('Base64 decode is unavailable in this runtime');
  }
  return globalThis.atob(padded);
}

/** Read `exp` from a JWT without verifying the signature (server is authoritative). */
export function readJwtExpiresAtMs(token: string): number | null {
  try {
    const payloadSegment = token.split('.')[1];
    if (!payloadSegment) return null;
    const payload = JSON.parse(decodeBase64Url(payloadSegment)) as { exp?: unknown };
    return typeof payload.exp === 'number' ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

export function resolveSessionExpiresAtMs(
  expiresAt: string | undefined,
  token: string,
): number | null {
  if (expiresAt) {
    const parsed = Date.parse(expiresAt);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return readJwtExpiresAtMs(token);
}

export function isSessionExpired(expiresAtMs: number, now = Date.now()): boolean {
  return now >= expiresAtMs;
}

export function isIdleSessionExpired(lastActivityAtMs: number, now = Date.now()): boolean {
  return now - lastActivityAtMs >= IDLE_TIMEOUT_MS;
}

export function isScriptAnalysisInProgress(status: ScriptAnalysisStatus | undefined): boolean {
  if (status == null) return false;
  return status !== 'COMPLETED' && status !== 'FAILED';
}

export function formatRemainingSession(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins <= 0) return `${secs}s`;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
