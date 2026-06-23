import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CircuitLogo } from '@/components/CircuitLogo';
import { useContentFrame } from '@/hooks/useContentFrame';
import { colors, radius, spacing, typography } from '@/theme';

export default function WelcomeScreen() {
  const router = useRouter();
  const { isLandscape, isCompactHeight, horizontalPadding, maxWidth } = useContentFrame('form');
  const splitLayout = isLandscape && !isCompactHeight;

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom', 'left', 'right']}>
      <View style={styles.glow} />
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          splitLayout && styles.scrollLandscape,
          { paddingHorizontal: horizontalPadding },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.inner,
            maxWidth != null && { maxWidth, alignSelf: 'center', width: '100%' },
            splitLayout && styles.innerLandscape,
          ]}
        >
          <View style={[styles.hero, splitLayout && styles.heroLandscape]}>
            <CircuitLogo size={isCompactHeight ? 'sm' : 'md'} />
            <Text style={[styles.wordmark, isCompactHeight && styles.wordmarkCompact]}>
              CIRCUI<Text style={styles.wordmarkAccent}>IT</Text>
            </Text>
            <Text style={styles.tagline}>FOR FILMMAKERS</Text>
          </View>

          <View style={[styles.side, splitLayout && styles.sideLandscape]}>
            <View style={styles.copyBlock}>
              <Text style={styles.headline}>One workspace for your entire production.</Text>
              <Text style={styles.body}>
                Upload scripts, map departments, track tasks, schedule shoot days, and keep your crew
                aligned — before cameras roll.
              </Text>
            </View>

            <View style={styles.actions}>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push({ pathname: '/(auth)/auth', params: { tab: 'signup' } })}
                style={({ pressed }) => [styles.primaryBtn, pressed && styles.primaryBtnPressed]}
              >
                <Text style={styles.primaryBtnText}>Create production workspace</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push({ pathname: '/(auth)/auth', params: { tab: 'signin' } })}
                style={({ pressed }) => [styles.secondaryBtn, pressed && styles.secondaryBtnPressed]}
              >
                <Text style={styles.secondaryBtnText}>Sign in</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F3F0EA',
  },
  glow: {
    position: 'absolute',
    top: '18%',
    alignSelf: 'center',
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(244,122,31,0.16)',
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: spacing.xl,
  },
  scrollLandscape: {
    justifyContent: 'center',
    minHeight: '100%',
  },
  inner: {
    gap: spacing.xl,
  },
  innerLandscape: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxl,
  },
  hero: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  heroLandscape: {
    flex: 1,
  },
  side: {
    gap: spacing.xl,
  },
  sideLandscape: {
    flex: 1,
    justifyContent: 'center',
  },
  wordmark: { fontSize: 34, fontWeight: '800', color: colors.textPrimary, letterSpacing: 0.5 },
  wordmarkCompact: { fontSize: 28 },
  wordmarkAccent: { color: colors.brand },
  tagline: { ...typography.micro, color: colors.textMuted },
  copyBlock: { gap: spacing.md },
  headline: {
    ...typography.heading,
    color: colors.textPrimary,
    lineHeight: 30,
  },
  body: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 24,
  },
  actions: { gap: spacing.sm },
  primaryBtn: {
    backgroundColor: colors.brand,
    borderRadius: radius.pill,
    paddingVertical: spacing.md + 4,
    alignItems: 'center',
  },
  primaryBtnPressed: { opacity: 0.9 },
  primaryBtnText: { ...typography.bodyStrong, color: colors.onBrand },
  secondaryBtn: {
    borderRadius: radius.pill,
    paddingVertical: spacing.md + 2,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  secondaryBtnPressed: { opacity: 0.9 },
  secondaryBtnText: { ...typography.bodyStrong, color: colors.textPrimary },
});
