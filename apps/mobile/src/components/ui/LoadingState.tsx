import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { colors, spacing } from '@/theme';

interface LoadingStateProps {
  minHeight?: number;
}

export function LoadingState({ minHeight = 240 }: LoadingStateProps) {
  return (
    <View style={[styles.wrap, { minHeight }]}>
      <ActivityIndicator color={colors.brand} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
});
