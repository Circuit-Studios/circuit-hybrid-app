import { spacing } from '@/theme';

/** Visual height of the floating tab bar capsule (excluding safe-area padding). */
export const FLOATING_TAB_BAR_HEIGHT = 72;

/** Touch target / icon well size for each tab item. */
export const FLOATING_TAB_ITEM_SIZE = 56;

/** Max width of the floating bar on tablet / wide layouts. */
export const FLOATING_TAB_BAR_MAX_WIDTH = 520;

/** Vertical space to reserve so scroll content clears a floating app tab bar. */
export function getAppTabBarReserve(_compact: boolean, safeBottom: number): number {
  return FLOATING_TAB_BAR_HEIGHT + Math.max(safeBottom, spacing.sm) + spacing.lg;
}

/** Vertical space to reserve above a floating project workspace tab bar. */
export function getProjectTabBarReserve(_compact: boolean, safeBottom: number): number {
  return FLOATING_TAB_BAR_HEIGHT + Math.max(safeBottom, spacing.sm) + spacing.lg;
}
