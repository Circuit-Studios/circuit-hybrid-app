import { spacing, tabBar } from '@/theme';

/** Visual height of the floating tab bar capsule (excluding safe-area padding). */
export const FLOATING_TAB_BAR_HEIGHT = tabBar.height;

/** Shorter icon-only capsule used on landscape phones / short viewports. */
export const FLOATING_TAB_BAR_COMPACT_HEIGHT = 60;

/** Active icon yellow circle diameter. */
export const FLOATING_TAB_BAR_ACTIVE_CIRCLE_SIZE = tabBar.activeCircleSize;

/** Minimum touch target for each tab item (inactive well). */
export const FLOATING_TAB_ITEM_MIN = tabBar.itemTouchMin;

/** Max width of the floating bar. */
export const FLOATING_TAB_BAR_MAX_WIDTH = 430;

/** Share of screen width used on phones (84–88%). */
export const FLOATING_TAB_BAR_WIDTH_RATIO = 0.86;

/** Vertical space to reserve so scroll content clears a floating app tab bar. */
export function getAppTabBarReserve(compact: boolean, safeBottom: number): number {
  const barHeight = compact ? FLOATING_TAB_BAR_COMPACT_HEIGHT : FLOATING_TAB_BAR_HEIGHT;
  const gap = compact ? spacing.md : spacing.xl;
  return barHeight + Math.max(safeBottom, spacing.sm) + gap;
}

/** Vertical space to reserve above a floating project workspace tab bar. */
export function getProjectTabBarReserve(compact: boolean, safeBottom: number): number {
  const barHeight = compact ? FLOATING_TAB_BAR_COMPACT_HEIGHT : FLOATING_TAB_BAR_HEIGHT;
  const gap = compact ? spacing.md : spacing.xl;
  return barHeight + Math.max(safeBottom, spacing.sm) + gap;
}
