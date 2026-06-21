import { useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { CircuitLogo } from '@/components/CircuitLogo';
import { colors, spacing, typography } from '@/theme';

const SPLASH_MS = 2200;

export default function SplashScreen() {
  const router = useRouter();
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration: SPLASH_MS - 400,
      useNativeDriver: false,
    }).start();

    const timer = setTimeout(() => {
      router.replace('/(auth)/auth');
    }, SPLASH_MS);

    return () => clearTimeout(timer);
  }, [progress, router]);

  const barWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['12%', '100%'],
  });

  return (
    <View style={styles.screen}>
      <View style={styles.glow} />
      <View style={styles.center}>
        <View style={styles.logoFrame}>
          <CircuitLogo size="lg" />
        </View>
        <Text style={styles.wordmark}>
          CIRCUI<Text style={styles.wordmarkAccent}>IT</Text>
        </Text>
        <View style={styles.rule} />
        <Text style={styles.for}>FOR FILMMAKERS</Text>
        <Text style={styles.tagline}>Your film. Your team. One place.</Text>
      </View>
      <View style={styles.footer}>
        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressFill, { width: barWidth }]} />
        </View>
        <Text style={styles.version}>v1.0 · circuit.app</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F3F0EA',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
    justifyContent: 'space-between',
  },
  glow: {
    position: 'absolute',
    top: '22%',
    alignSelf: 'center',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(244,122,31,0.18)',
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  logoFrame: {
    padding: spacing.lg,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    backgroundColor: 'rgba(255,255,255,0.65)',
    marginBottom: spacing.md,
  },
  wordmark: { fontSize: 34, fontWeight: '800', color: colors.textPrimary, letterSpacing: 0.5 },
  wordmarkAccent: { color: colors.brand },
  rule: { width: 48, height: 3, borderRadius: 2, backgroundColor: colors.brand, marginVertical: spacing.sm },
  for: { ...typography.micro, color: colors.textMuted },
  tagline: { ...typography.body, color: colors.textSecondary, fontStyle: 'italic', marginTop: spacing.xs },
  footer: { gap: spacing.md },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(0,0,0,0.08)',
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: colors.brand, borderRadius: 2 },
  version: { ...typography.caption, color: colors.textMuted, textAlign: 'center' },
});
