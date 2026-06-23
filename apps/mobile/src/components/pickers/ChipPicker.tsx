import { ScrollView, Text, View, Pressable } from 'react-native';
import { pickerStyles as styles } from './pickerStyles';
import type { PickerOption } from './DropdownPicker';

interface ChipPickerProps<T extends string> {
  label: string;
  options: PickerOption<T>[];
  value: T | null;
  onChange: (value: T) => void;
}

export function ChipPicker<T extends string>({
  label,
  options,
  value,
  onChange,
}: ChipPickerProps<T>) {
  return (
    <View>
      <Text style={styles.label}>{label}</Text>
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
              style={[styles.chip, active && styles.chipActive]}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{option.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
