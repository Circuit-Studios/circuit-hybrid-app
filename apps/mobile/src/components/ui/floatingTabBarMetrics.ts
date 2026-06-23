import { spacing } from '@/theme';

/** Visual height of the floating tab bar capsule (excluding safe-area padding). */
export const FLOATING_TAB_BAR_HEIGHT = 77;

/** Minimum touch target for each tab item. */
export const FLOATING_TAB_ITEM_MIN = 44;

/** Wider active tab pill width. */
export const FLOATING_TAB_ITEM_ACTIVE_WIDTH = 72;

/** Max width of the floating bar. */
export const FLOATING_TAB_BAR_MAX_WIDTH = 430;

/** Share of screen width used on phones (84–88%). */
export const FLOATING_TAB_BAR_WIDTH_RATIO = 0.86;

/** Vertical space to reserve so scroll content clears a floating app tab bar. */
export function getAppTabBarReserve(_compact: boolean, safeBottom: number): number {
  return FLOATING_TAB_BAR_HEIGHT + Math.max(safeBottom, spacing.sm) + spacing.lg;
}

/** Vertical space to reserve above a floating project workspace tab bar. */
export function getProjectTabBarReserve(_compact: boolean, safeBottom: number): number {
  return FLOATING_TAB_BAR_HEIGHT + Math.max(safeBottom, spacing.sm) + spacing.lg;
}
