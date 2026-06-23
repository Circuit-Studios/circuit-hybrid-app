import {
  getAppTabBarReserve,
  getDropdownListMaxHeight,
  getKanbanColumnWidth,
  getOtpBoxSize,
  getProjectTabBarReserve,
  isCompactHeight,
  isLandscapeOrientation,
  isTabletWidth,
  isWideLayout,
  resolveContentMaxWidth,
} from '@/theme/layout';

describe('layout helpers', () => {
  it('detects tablet and landscape', () => {
    expect(isTabletWidth(767)).toBe(false);
    expect(isTabletWidth(768)).toBe(true);
    expect(isLandscapeOrientation(900, 400)).toBe(true);
    expect(isWideLayout(900, 400)).toBe(true);
  });

  it('detects compact height in landscape phones', () => {
    expect(isCompactHeight(400, 900)).toBe(true);
    expect(isCompactHeight(800, 400)).toBe(false);
  });

  it('resolves content max width by constraint', () => {
    expect(resolveContentMaxWidth(400, 'form')).toBe(480);
    expect(resolveContentMaxWidth(400, 'auto')).toBeUndefined();
    expect(resolveContentMaxWidth(900, 'auto')).toBe(840);
  });

  it('sizes OTP boxes within bounds', () => {
    const small = getOtpBoxSize(300);
    expect(small.width).toBeGreaterThanOrEqual(44);
    const large = getOtpBoxSize(480);
    expect(large.width).toBeLessThanOrEqual(56);
  });

  it('widens kanban columns when space allows', () => {
    const phone = getKanbanColumnWidth(360);
    const tablet = getKanbanColumnWidth(840);
    expect(tablet).toBeGreaterThanOrEqual(phone);
  });

  it('reserves space for floating tab bars', () => {
    const portrait = getAppTabBarReserve(false, 34);
    const landscape = getAppTabBarReserve(true, 21);
    expect(portrait).toBeGreaterThan(landscape);
    expect(getProjectTabBarReserve(true, 0)).toBeGreaterThan(40);
  });

  it('sizes dropdown list for portrait and landscape', () => {
    const portrait = getDropdownListMaxHeight({
      windowHeight: 844,
      triggerY: 520,
      triggerHeight: 48,
      safeBottom: 34,
      optionCount: 4,
    });
    expect(portrait.useModalSheet).toBe(false);
    expect(portrait.maxHeight).toBeGreaterThanOrEqual(120);

    const landscape = getDropdownListMaxHeight({
      windowHeight: 390,
      triggerY: 300,
      triggerHeight: 48,
      safeBottom: 21,
      optionCount: 8,
    });
    expect(landscape.useModalSheet).toBe(true);
    expect(landscape.maxHeight).toBeGreaterThanOrEqual(120);
  });
});
