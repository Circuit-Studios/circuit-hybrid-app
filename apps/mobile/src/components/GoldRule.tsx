import { StyleSheet, View, type ViewStyle } from 'react-native';
import { colors, spacing } from '@/theme';

interface GoldRuleProps {
  style?: ViewStyle;
  width?: number | `${number}%`;
}

/** Thin brand accent divider. */
export function GoldRule({ style, width = 48 }: GoldRuleProps) {
  return (
    <View style={[styles.wrap, style]}>
      <View style={[styles.line, { width }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginVertical: spacing.md },
  line: {
    height: 1,
    backgroundColor: colors.brand,
    opacity: 0.65,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },
});
