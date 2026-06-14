import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { ScreenContainer } from '@/components/ScreenContainer';
import { CircuitLogo } from '@/components/CircuitLogo';
import { PrimaryButton } from '@/components/PrimaryButton';
import { colors, spacing, typography } from '@/theme';

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <ScreenContainer constrained="form" centerContent contentStyle={styles.screen}>
      <View style={styles.center}>
        <View style={styles.brand}>
          <CircuitLogo size="lg" />
          <Text style={styles.wordmark}>CIRCUIT</Text>
        </View>

        <View style={styles.actions}>
          <PrimaryButton title="Get started" onPress={() => router.push('/(auth)/signup?ctx=starter')} />
          <PrimaryButton
            title="I already have an account"
            variant="ghost"
            onPress={() => router.push('/(auth)/login')}
          />
          <Text style={styles.legal}>
            By continuing you agree to our Terms and Privacy Policy.
          </Text>
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  screen: { paddingTop: 0 },
  center: {
    width: '100%',
    alignItems: 'center',
    gap: spacing.xxl,
  },
  brand: {
    alignItems: 'center',
    gap: spacing.lg,
  },
  wordmark: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 8,
    color: colors.textSecondary,
  },
  actions: {
    width: '100%',
    gap: spacing.sm,
  },
  legal: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.md,
  },
});
