import { useMemo } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useContentFrame } from '@/hooks/useContentFrame';
import { getAppTabBarReserve, getProjectTabBarReserve, isTabletWidth } from '@/theme/layout';
import { spacing } from '@/theme';

/**
 * Orientation-aware chrome metrics for floating glass tab bars and screen padding.
 * Compact mode (landscape phones / short viewports) uses icon-only app tabs.
 */
export function useChromeInsets() {
  const insets = useSafeAreaInsets();
  const frame = useContentFrame('auto');

  return useMemo(() => {
    const compactTabBar =
      frame.isCompactHeight || (frame.isLandscape && !isTabletWidth(frame.width));

    return {
      ...frame,
      compactTabBar,
      appTabBarReserve: getAppTabBarReserve(compactTabBar, insets.bottom),
      projectTabBarReserve: getProjectTabBarReserve(compactTabBar, insets.bottom),
      safeHorizontal: Math.max(spacing.lg, insets.left, insets.right),
      tabBarMaxWidth: isTabletWidth(frame.width) ? 520 : undefined,
    };
  }, [
    frame.contentWidth,
    frame.height,
    frame.horizontalPadding,
    frame.isCompactHeight,
    frame.isLandscape,
    frame.isTablet,
    frame.isWide,
    frame.maxWidth,
    frame.width,
    insets.bottom,
    insets.left,
    insets.right,
  ]);
}
