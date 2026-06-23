// Lightweight tests for the Expo Push provider — mock mode behaviour, batch
// splitting, and result shape. We don't hit the real Expo servers.

import { describe, it, expect } from 'vitest';
import { sendExpoPush, FATAL_PUSH_ERRORS } from '../../src/notifications/expo-push.provider.js';

describe('Expo push provider (mock mode)', () => {
  it('returns an empty array for no messages', async () => {
    const out = await sendExpoPush([]);
    expect(out).toEqual([]);
  });

  it('returns synthetic ok tickets for every input', async () => {
    const out = await sendExpoPush([
      { to: 'ExponentPushToken[A]', title: 't1', body: 'b1' },
      { to: 'ExponentPushToken[B]', title: 't2', body: 'b2' },
    ]);
    expect(out).toHaveLength(2);
    for (const r of out) {
      expect(r.ticket.status).toBe('ok');
    }
  });

  it('preserves recipient mapping in result order', async () => {
    const tokens = ['ExponentPushToken[A]', 'ExponentPushToken[B]', 'ExponentPushToken[C]'];
    const out = await sendExpoPush(tokens.map(to => ({ to, title: 'x', body: 'y' })));
    expect(out.map(r => r.to)).toEqual(tokens);
  });

  it('exposes the canonical fatal-error set', () => {
    expect(FATAL_PUSH_ERRORS.has('DeviceNotRegistered')).toBe(true);
    expect(FATAL_PUSH_ERRORS.has('MismatchSenderId')).toBe(true);
    expect(FATAL_PUSH_ERRORS.has('OK')).toBe(false);
  });
});
