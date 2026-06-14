import { StyleSheet, Text } from 'react-native';
import { colors, spacing, typography } from '@/theme';

interface FormErrorTextProps {
  children: string;
}

export function FormErrorText({ children }: FormErrorTextProps) {
  return <Text style={styles.error}>{children}</Text>;
}

const styles = StyleSheet.create({
  error: { ...typography.caption, color: colors.danger, marginTop: spacing.sm },
});
