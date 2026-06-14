import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '@/theme';
import { GoldRule } from '@/components/GoldRule';

interface SectionHeaderProps {
  title: string;
  sub?: string;
  trailing?: React.ReactNode;
}

export function SectionHeader({ title, sub, trailing }: SectionHeaderProps) {
  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <View style={styles.text}>
          <Text style={styles.title}>{title}</Text>
          {sub ? <Text style={styles.sub}>{sub}</Text> : null}
        </View>
        {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
      </View>
      <GoldRule width={48} style={styles.rule} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  text: { flex: 1 },
  title: { ...typography.heading, color: colors.textPrimary },
  sub: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.xs },
  trailing: { marginLeft: spacing.sm },
  rule: { marginTop: spacing.sm },
});
