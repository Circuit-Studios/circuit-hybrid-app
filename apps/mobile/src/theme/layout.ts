import type { ViewStyle } from 'react-native';
import {
  FLOATING_TAB_BAR_HEIGHT,
  FLOATING_TAB_BAR_MAX_WIDTH,
  FLOATING_TAB_ITEM_MIN,
  getAppTabBarReserve,
  getProjectTabBarReserve,
} from '@/components/ui/floatingTabBarMetrics';
import { spacing } from './tokens';

export {
  FLOATING_TAB_BAR_HEIGHT,
  FLOATING_TAB_BAR_MAX_WIDTH,
  FLOATING_TAB_ITEM_MIN,
  getAppTabBarReserve,
  getProjectTabBarReserve,
};
export const TABLET_BREAKPOINT = 768;

/** Width at which we add a third column in dense grids. */
export const LARGE_TABLET_BREAKPOINT = 1024;

export const CONTENT_MAX_WIDTH = {
  /** Auth forms and narrow flows. */
  form: 480,
  /** Main app lists and dashboards. */
  app: 840,
} as const;

export type ContentConstraint = false | 'form' | 'app' | 'auto';

export function isTabletWidth(width: number): boolean {
  return width >= TABLET_BREAKPOINT;
}

/**
 * True tablet/iPad-class device, based on the shortest screen edge so a phone
 * rotated to landscape (logical width >= 768) is NOT mistaken for a tablet.
 */
export function isTabletDevice(width: number, height: number): boolean {
  return Math.min(width, height) >= TABLET_BREAKPOINT;
}

export function isLandscapeOrientation(width: number, height: number): boolean {
  return width > height;
}

/** Tablet width or landscape — use multi-column / side-by-side layouts. */
export function isWideLayout(width: number, height: number): boolean {
  return isTabletWidth(width) || isLandscapeOrientation(width, height);
}

/** Short viewport — prefer scroll and tighter vertical spacing. */
export function isCompactHeight(height: number, width: number): boolean {
  return height < 640 || (width > height && height < 480);
}

export function getHorizontalPadding(width: number): number {
  if (width >= LARGE_TABLET_BREAKPOINT) return spacing.xxxl;
  if (width >= TABLET_BREAKPOINT) return spacing.xxl;
  return spacing.xl;
}

export function resolveContentMaxWidth(
  width: number,
  constrained: ContentConstraint,
): number | undefined {
  if (constrained === false) return undefined;
  if (constrained === 'form') return CONTENT_MAX_WIDTH.form;
  if (constrained === 'app') return CONTENT_MAX_WIDTH.app;
  return isTabletWidth(width) ? CONTENT_MAX_WIDTH.app : undefined;
}

export function getContentWidth(
  width: number,
  horizontalPadding: number,
  maxWidth?: number,
): number {
  const padded = width - horizontalPadding * 2;
  if (maxWidth == null) return padded;
  return Math.min(padded, maxWidth);
}

export function getKanbanColumnWidth(contentWidth: number, columnCount = 4): number {
  const gap = spacing.md;
  const minWidth = 240;
  const maxWidth = 320;
  const fit = (contentWidth - gap * (columnCount - 1)) / columnCount;
  if (fit >= minWidth) return Math.min(maxWidth, Math.floor(fit));
  return 280;
}

export function getOtpBoxSize(contentWidth: number): { width: number; height: number } {
  const gap = spacing.sm;
  const count = 6;
  const width = Math.floor((contentWidth - gap * (count - 1)) / count);
  const clamped = Math.min(56, Math.max(44, width));
  return { width: clamped, height: Math.round(clamped * 1.2) };
}

export function getDeptCardStyle(contentWidth: number): ViewStyle {
  const minWidth = 160;
  const maxWidth = 320;

  if (contentWidth >= 900) {
    return { flexGrow: 1, flexBasis: '31%', minWidth, maxWidth };
  }
  if (contentWidth >= 600) {
    return { flexGrow: 1, flexBasis: '48%', minWidth, maxWidth: 360 };
  }
  return { width: '48%', minWidth };
}

export function getHealthRingSize(contentWidth: number, isWide: boolean, height: number): number {
  if (height < 400) return 88;
  if (!isWide) return 104;
  return Math.min(124, Math.max(104, Math.round(contentWidth * 0.18)));
}

const DROPDOWN_OPTION_ROW_HEIGHT = 48;
const DROPDOWN_MIN_LIST_HEIGHT = 120;
const DROPDOWN_MAX_LIST_HEIGHT = 240;

/** Max height for an inline dropdown list from trigger position and viewport. */
export function getDropdownListMaxHeight(params: {
  windowHeight: number;
  triggerY: number;
  triggerHeight: number;
  safeBottom: number;
  optionCount: number;
  extraChrome?: number;
}): { maxHeight: number; useModalSheet: boolean } {
  const {
    windowHeight,
    triggerY,
    triggerHeight,
    safeBottom,
    optionCount,
    extraChrome = 0,
  } = params;

  const margin = spacing.lg;
  const availableBelow = windowHeight - safeBottom - margin - (triggerY + triggerHeight);
  const fullListHeight = optionCount * DROPDOWN_OPTION_ROW_HEIGHT + extraChrome;
  const idealHeight = Math.min(DROPDOWN_MAX_LIST_HEIGHT, fullListHeight);

  if (availableBelow >= idealHeight) {
    return { maxHeight: idealHeight, useModalSheet: false };
  }

  if (availableBelow >= DROPDOWN_MIN_LIST_HEIGHT) {
    return {
      maxHeight: Math.min(idealHeight, availableBelow),
      useModalSheet: false,
    };
  }

  const modalHeight = Math.min(
    DROPDOWN_MAX_LIST_HEIGHT,
    fullListHeight,
    Math.max(DROPDOWN_MIN_LIST_HEIGHT, windowHeight * 0.5 - safeBottom),
  );

  return {
    maxHeight: modalHeight,
    useModalSheet: true,
  };
}

export const dropdownLayout = {
  optionRowHeight: DROPDOWN_OPTION_ROW_HEIGHT,
  minListHeight: DROPDOWN_MIN_LIST_HEIGHT,
  maxListHeight: DROPDOWN_MAX_LIST_HEIGHT,
} as const;
