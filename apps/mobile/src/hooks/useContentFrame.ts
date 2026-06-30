import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';
import {
  type ContentConstraint,
  getContentWidth,
  getHorizontalPadding,
  isCompactHeight,
  isLandscapeOrientation,
  isTabletDevice,
  isWideLayout,
  resolveContentMaxWidth,
} from '@/theme/layout';

export function useContentFrame(constrained: ContentConstraint = 'auto') {
  const { width, height } = useWindowDimensions();

  return useMemo(() => {
    const horizontalPadding = getHorizontalPadding(width);
    const maxWidth = resolveContentMaxWidth(width, constrained);
    const contentWidth = getContentWidth(width, horizontalPadding, maxWidth);
    const isLandscape = isLandscapeOrientation(width, height);
    const isTablet = isTabletDevice(width, height);
    const isWide = isWideLayout(width, height);

    return {
      width,
      height,
      horizontalPadding,
      maxWidth,
      contentWidth,
      isLandscape,
      isTablet,
      isWide,
      isCompactHeight: isCompactHeight(height, width),
      isLargeTablet: width >= 1024,
    };
  }, [constrained, height, width]);
}

export type ContentFrame = ReturnType<typeof useContentFrame>;
