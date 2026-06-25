import { describe, expect, it } from '@jest/globals';
import { getAuthMetrics } from '@/features/auth/getAuthLayoutMetrics';

describe('getAuthMetrics', () => {
  it('enables two-column layout in landscape when width >= 700', () => {
    const metrics = getAuthMetrics(844, 390, 0, 21, 'signUp');
    expect(metrics.isLandscapeTwoColumn).toBe(true);
    expect(metrics.brandColumnWidth).toBe(340);
    expect(metrics.formColumnWidth).toBe(420);
  });

  it('uses portrait single-column layout on narrow phones', () => {
    const metrics = getAuthMetrics(390, 844, 59, 34, 'signUp');
    expect(metrics.isLandscapeTwoColumn).toBe(false);
    expect(metrics.brandColumnWidth).toBeUndefined();
  });

  it('reserves a flex sticky footer for sign-up, not scroll overlap padding', () => {
    const metrics = getAuthMetrics(390, 844, 59, 34, 'signUp');
    expect(metrics.signupScrollPaddingBottom).toBeGreaterThan(0);
    expect(metrics.stickyFooterPaddingTop).toBeGreaterThan(0);
    expect(metrics.scrollBottomReserve).toBe(0);
    expect(metrics.stickyCtaBottomOffset).toBe(8);
  });

  it('keeps sign-in in normal flow without sticky footer metrics', () => {
    const metrics = getAuthMetrics(390, 844, 59, 34, 'signIn');
    expect(metrics.signupScrollPaddingBottom).toBe(0);
    expect(metrics.stickyFooterPaddingTop).toBe(0);
    expect(metrics.ctaMarginTop).toBeGreaterThan(0);
  });
});
