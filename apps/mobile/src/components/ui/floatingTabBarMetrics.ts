import { spacing, tabBar } from '@/theme';

/** Visual height of the floating tab bar capsule (excluding safe-area padding). */
export const FLOATING_TAB_BAR_HEIGHT = tabBar.height;

/** Active icon highlight pill width. */
export const FLOATING_TAB_BAR_ACTIVE_PILL_WIDTH = tabBar.activePillWidth;

/** Active icon highlight pill height. */
export const FLOATING_TAB_BAR_ACTIVE_PILL_HEIGHT = tabBar.activePillHeight;

/** Minimum touch target for each tab item (inactive well). */
export const FLOATING_TAB_ITEM_MIN = tabBar.itemTouchMin;

/** Max width of the floating bar. */
export const FLOATING_TAB_BAR_MAX_WIDTH = 430;

/** Share of screen width used on phones (84–88%). */
export const FLOATING_TAB_BAR_WIDTH_RATIO = 0.86;

/** Vertical space to reserve so scroll content clears a floating app tab bar. */
export function getAppTabBarReserve(_compact: boolean, safeBottom: number): number {
  return FLOATING_TAB_BAR_HEIGHT + Math.max(safeBottom, spacing.sm) + spacing.xl;
}

/** Vertical space to reserve above a floating project workspace tab bar. */
export function getProjectTabBarReserve(_compact: boolean, safeBottom: number): number {
  return FLOATING_TAB_BAR_HEIGHT + Math.max(safeBottom, spacing.sm) + spacing.xl;
}
