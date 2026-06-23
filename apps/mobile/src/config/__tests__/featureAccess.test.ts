import { canUseFeature, isSignupChannel, supportsLoginChannel } from '@/config/featureAccess';

describe('featureAccess', () => {
  it('returns false when server flag is disabled', () => {
    expect(
      canUseFeature({
        feature: 'scripts.upload',
        flags: { 'scripts.upload': false },
      }),
    ).toBe(false);
  });

  it('defaults missing flags to enabled', () => {
    expect(
      canUseFeature({
        feature: 'scripts.upload',
        flags: {},
      }),
    ).toBe(true);
  });

  it('matches signup channel from server config', () => {
    expect(isSignupChannel('EMAIL', 'EMAIL')).toBe(true);
    expect(isSignupChannel('PHONE', 'EMAIL')).toBe(false);
  });

  it('supports login identifier modes', () => {
    expect(supportsLoginChannel('PHONE', 'BOTH')).toBe(true);
    expect(supportsLoginChannel('EMAIL', 'PHONE')).toBe(false);
  });
});
