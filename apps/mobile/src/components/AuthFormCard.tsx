import { StyleSheet, View, type ViewStyle } from 'react-native';
import { Card } from '@/components/Card';
import { spacing } from '@/theme';

interface AuthFormCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

/** Glass panel for sign-in / sign-up fields — keeps auth flows visually consistent. */
export function AuthFormCard({ children, style }: AuthFormCardProps) {
  return (
    <Card variant="glass" style={style ? [styles.card, style] : styles.card}>
      {children}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
});
