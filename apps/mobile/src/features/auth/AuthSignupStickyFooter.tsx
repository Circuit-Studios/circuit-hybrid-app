import { type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import type { AuthLayoutMetrics } from '@/features/auth/getAuthLayoutMetrics';
import { authPalette } from '@/theme/authPalette';

interface AuthSignupStickyFooterProps {
  metrics: AuthLayoutMetrics;
  contentMaxWidth: number;
  horizontalPadding: number;
  safeBottom: number;
  children: ReactNode;
}

/** Sign-up CTA bar — flex sibling below the scroll area, aligned with the form column. */
export function AuthSignupStickyFooter({
  metrics,
  contentMaxWidth,
  horizontalPadding,
  safeBottom,
  children,
}: AuthSignupStickyFooterProps) {
  return (
    <View
      style={[
        styles.bar,
        {
          paddingTop: metrics.stickyFooterPaddingTop,
          paddingBottom: safeBottom + metrics.stickyCtaBottomOffset,
          paddingHorizontal: horizontalPadding,
        },
      ]}
    >
      <View
        style={[
          styles.inner,
          metrics.isLandscapeTwoColumn && styles.twoColumn,
          {
            maxWidth: contentMaxWidth,
            gap: metrics.columnGap,
          },
        ]}
      >
        {metrics.isLandscapeTwoColumn ? (
          <>
            <View style={{ width: metrics.brandColumnWidth }} />
            <View style={{ flex: 1, maxWidth: metrics.formColumnWidth }}>{children}</View>
          </>
        ) : (
          children
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: authPalette.bg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(17,17,17,0.06)',
  },
  inner: {
    width: '100%',
    alignSelf: 'center',
  },
  twoColumn: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    width: '100%',
  },
});
