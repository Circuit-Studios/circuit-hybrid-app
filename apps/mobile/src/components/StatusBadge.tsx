import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '@/theme';

type Tone = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'accent';

interface StatusBadgeProps {
  label: string;
  tone?: Tone;
}

const TONES: Record<Tone, { bg: string; fg: string }> = {
  neutral: { bg: colors.surfaceMuted, fg: colors.textSecondary },
  info: { bg: 'rgba(59, 130, 246, 0.14)', fg: colors.info },
  success: { bg: colors.successSoft, fg: colors.success },
  warning: { bg: 'rgba(224, 162, 74, 0.18)', fg: colors.warning },
  danger: { bg: colors.dangerSoft, fg: colors.danger },
  accent: { bg: colors.brandSoft, fg: colors.brand },
};

export function StatusBadge({ label, tone = 'neutral' }: StatusBadgeProps) {
  const t = TONES[tone];
  return (
    <View style={[styles.badge, { backgroundColor: t.bg }]}>
      <Text style={[styles.label, { color: t.fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
  },
  label: { ...typography.micro, textTransform: 'uppercase' },
});
