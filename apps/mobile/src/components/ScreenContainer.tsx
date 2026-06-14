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
}

export function ScreenContainer({
  children,
  scroll = false,
  edges = ['top', 'bottom', 'left', 'right'],
  contentStyle,
  topAligned = false,
  constrained = 'auto',
  centerContent = false,
}: ScreenContainerProps) {
  const { horizontalPadding, maxWidth } = useContentFrame(constrained);

  const Content = (
    <View
      style={[
        styles.content,
        { paddingHorizontal: horizontalPadding },
        !scroll && styles.contentFlex,
        topAligned && styles.topAligned,
        contentStyle,
      ]}
    >
      <View
        style={[
          styles.inner,
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
              styles.scrollContent,
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
  innerCenter: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  innerScrollCenter: { width: '100%', alignItems: 'center' },
  constrained: { alignSelf: 'center' },
  topAligned: { flex: 0 },
  scrollContent: { flexGrow: 1 },
  scrollContentCenter: { justifyContent: 'center', alignItems: 'center' },
});
