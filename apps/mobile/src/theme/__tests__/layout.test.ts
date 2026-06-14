import {
  getKanbanColumnWidth,
  getOtpBoxSize,
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
});
