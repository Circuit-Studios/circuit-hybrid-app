import type { ViewStyle } from 'react-native';
import { spacing } from './tokens';

/** Width at which we treat the device as a tablet layout. */
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

export function getContentWidth(width: number, horizontalPadding: number, maxWidth?: number): number {
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
  if (height < 400) return 160;
  if (height < 520 && isWide) return 180;
  if (!isWide) return 220;
  return Math.min(260, Math.max(200, Math.round(contentWidth * 0.28)));
}
