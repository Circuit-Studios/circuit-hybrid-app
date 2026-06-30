import { ScrollView, Text, View, Pressable, StyleSheet } from 'react-native';
import { authPalette } from '@/theme/authPalette';
import { colors, spacing, typography } from '@/theme';
import { fontFamily } from '@/theme/fonts';
import { pickerStyles as styles } from './pickerStyles';
import type { PickerOption } from './DropdownPicker';

interface ChipPickerProps<T extends string> {
  label: string;
  options: PickerOption<T>[];
  value: T | null;
  onChange: (value: T) => void;
  variant?: 'default' | 'auth';
}

export function ChipPicker<T extends string>({
  label,
  options,
  value,
  onChange,
  variant = 'default',
}: ChipPickerProps<T>) {
  const auth = variant === 'auth';

  return (
    <View style={auth && authStyles.wrap}>
      <Text style={[styles.label, auth && authStyles.label]}>{label}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {options.map((option) => {
          const active = value === option.value;
          return (
            <Pressable
              key={option.value}
              onPress={() => onChange(option.value)}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
              style={[
                styles.chip,
                auth && authStyles.chip,
                active && (auth ? authStyles.chipActive : styles.chipActive),
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  auth && authStyles.chipText,
                  active && (auth ? authStyles.chipTextActive : styles.chipTextActive),
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const authStyles = StyleSheet.create({
  wrap: { marginBottom: spacing.lg },
  label: { color: authPalette.label },
  chip: {
    backgroundColor: 'transparent',
    borderColor: authPalette.chipBorder,
  },
  chipActive: {
    backgroundColor: 'transparent',
    borderColor: authPalette.brand,
  },
  chipText: { color: authPalette.chipText },
  chipTextActive: { color: authPalette.brand, fontFamily: fontFamily.bold },
});
