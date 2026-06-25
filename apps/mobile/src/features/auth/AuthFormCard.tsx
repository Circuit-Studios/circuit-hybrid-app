import type { ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';

interface AuthFormCardProps {
  children: ReactNode;
  style?: ViewStyle;
}

/**
 * Layout container for auth fields. Kept visually minimal so inputs float on the
 * warm ivory `AuthBackground`, matching the approved white-glassy mockup.
 */
export function AuthFormCard({ children, style }: AuthFormCardProps) {
  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
  },
});
