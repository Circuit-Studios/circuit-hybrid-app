import { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CinematicBackdrop } from '@/components/CinematicBackdrop';
import { useContentFrame } from '@/hooks/useContentFrame';
import { type ContentConstraint } from '@/theme/layout';
import { colors, spacing } from '@/theme';

interface ScreenContainerProps {
  children: ReactNode;
  scroll?: boolean;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
  contentStyle?: ViewStyle;
  /**
   * When true, content stays at the top instead of flexing. Useful for
   * scrolling lists where we don't want bottom-center centering.
   */
  topAligned?: boolean;
  /**
   * Caps content width on tablets. `auto` centers app content up to 840px;
   * `form` narrows auth/forms to 480px; `false` uses full width.
   */
  constrained?: ContentConstraint;
  /** Vertically and horizontally center children (e.g. welcome / empty states). */
  centerContent?: boolean;
  /**
   * Extra bottom padding when content scrolls behind a floating tab bar.
   * Defaults to 0 — prefer `useChromeInsets().appTabBarReserve` on screen content.
   */
  bottomInsetForFloatingTab?: number;
}

export function ScreenContainer({
  children,
  scroll = false,
  edges = ['top', 'bottom', 'left', 'right'],
  contentStyle,
  topAligned = false,
  constrained = 'auto',
  centerContent = false,
  bottomInsetForFloatingTab = 0,
}: ScreenContainerProps) {
  const { horizontalPadding, maxWidth } = useContentFrame(constrained);

  const fillHeight = !scroll && !centerContent;

  const Content = (
    <View
      style={[
        styles.content,
        { paddingHorizontal: horizontalPadding },
        fillHeight && styles.contentFlex,
        topAligned && scroll && styles.topAligned,
        bottomInsetForFloatingTab > 0 && { paddingBottom: bottomInsetForFloatingTab },
        contentStyle,
      ]}
    >
      <View
        style={[
          styles.inner,
          fillHeight && styles.innerFlex,
          !scroll && centerContent && styles.innerCenter,
          scroll && centerContent && styles.innerScrollCenter,
          maxWidth != null && styles.constrained,
          maxWidth != null && { maxWidth },
        ]}
      >
        {children}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={edges}>
      <CinematicBackdrop />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {scroll ? (
          <ScrollView
            style={styles.flex}
            contentContainerStyle={[
              topAligned ? styles.scrollContentTopAligned : styles.scrollContent,
              centerContent && styles.scrollContentCenter,
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {Content}
          </ScrollView>
        ) : (
          Content
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  content: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
  contentFlex: { flex: 1 },
  inner: { width: '100%' },
  innerFlex: { flex: 1, minHeight: 0 },
  innerCenter: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  innerScrollCenter: { width: '100%', alignItems: 'center' },
  constrained: { alignSelf: 'center' },
  topAligned: { flexGrow: 0 },
  scrollContent: { flexGrow: 1 },
  scrollContentTopAligned: { flexGrow: 0 },
  scrollContentCenter: { justifyContent: 'center', alignItems: 'center' },
});
