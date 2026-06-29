import { canUseFeature, isSignupChannel, supportsLoginChannel } from '@/config/featureAccess';

describe('featureAccess', () => {
  it('reads server feature flags with enabled default', () => {
    expect(
      canUseFeature({
        feature: 'scripts.upload',
        flags: { 'scripts.upload': false },
      }),
    ).toBe(false);
    expect(
      canUseFeature({
        feature: 'scripts.upload',
        flags: {},
      }),
    ).toBe(true);
  });

  it('matches signup and login channel config', () => {
    expect(isSignupChannel('EMAIL', 'EMAIL')).toBe(true);
    expect(isSignupChannel('PHONE', 'EMAIL')).toBe(false);
    expect(supportsLoginChannel('PHONE', 'BOTH')).toBe(true);
    expect(supportsLoginChannel('EMAIL', 'PHONE')).toBe(false);
  });
});
