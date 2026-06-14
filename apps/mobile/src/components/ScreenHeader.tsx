import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { GoldRule } from '@/components/GoldRule';
import { colors, spacing, typography } from '@/theme';

interface ScreenHeaderProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  trailing?: React.ReactNode;
  style?: ViewStyle;
  /** Show a short gold rule under the title block. */
  showRule?: boolean;
  /** Larger title for marketing / auth hero screens. */
  size?: 'default' | 'large';
}

export function ScreenHeader({
  eyebrow,
  title,
  subtitle,
  trailing,
  style,
  showRule = false,
  size = 'default',
}: ScreenHeaderProps) {
  return (
    <View style={[styles.wrap, style]}>
      <View style={styles.textCol}>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        <Text style={[styles.title, size === 'large' && styles.titleLarge]}>{title}</Text>
        {showRule ? <GoldRule width={40} style={styles.rule} /> : null}
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  textCol: { flex: 1 },
  trailing: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  eyebrow: {
    ...typography.micro,
    color: colors.brand,
    marginBottom: spacing.sm,
  },
  title: {
    ...typography.title,
    color: colors.textPrimary,
  },
  titleLarge: {
    fontSize: 30,
    lineHeight: 36,
    letterSpacing: -0.6,
  },
  rule: { marginTop: spacing.sm, marginBottom: 0 },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.md,
    lineHeight: 24,
  },
});
