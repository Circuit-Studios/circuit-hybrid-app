import { useCallback, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { colors, radius, spacing, typography } from '@/theme';

interface DateFieldProps {
  label: string;
  value: Date | null;
  onChange: (next: Date) => void;
  hint?: string;
  error?: string;
  placeholder?: string;
  minimumDate?: Date;
  maximumDate?: Date;
  formatOptions?: Intl.DateTimeFormatOptions;
  testID?: string;
}

const DEFAULT_FORMAT: Intl.DateTimeFormatOptions = {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
  year: 'numeric',
};

export function DateField({
  label,
  value,
  onChange,
  hint,
  error,
  placeholder = 'Pick a date',
  minimumDate,
  maximumDate,
  formatOptions = DEFAULT_FORMAT,
  testID,
}: DateFieldProps) {
  const [open, setOpen] = useState(false);

  // Android fires onChange once per dismissal (event.type === 'dismissed' | 'set').
  // iOS inline fires continuously while the user changes the date; we keep the
  // picker open until the user taps Done.
  const handleChange = useCallback(
    (event: DateTimePickerEvent, selected?: Date) => {
      if (Platform.OS === 'android') {
        setOpen(false);
        if (event.type === 'set' && selected) {
          onChange(selected);
        }
        return;
      }
      if (selected) {
        onChange(selected);
      }
    },
    [onChange],
  );

  const displayValue = value ? value.toLocaleDateString(undefined, formatOptions) : placeholder;
  const hasValue = !!value;

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}, ${hasValue ? displayValue : placeholder}`}
        onPress={() => setOpen(prev => !prev)}
        style={({ pressed }) => [
          styles.inputWrap,
          error ? styles.inputError : null,
          pressed && styles.inputPressed,
        ]}
        testID={testID}
      >
        <Text style={[styles.value, !hasValue && styles.placeholder]}>{displayValue}</Text>
        <Text style={styles.chev}>{open ? '▾' : '›'}</Text>
      </Pressable>

      {open && Platform.OS === 'ios' ? (
        <View style={styles.iosPicker}>
          <DateTimePicker
            value={value ?? new Date()}
            mode="date"
            display="inline"
            onChange={handleChange}
            minimumDate={minimumDate}
            maximumDate={maximumDate}
            themeVariant="dark"
            accentColor={colors.accent}
            textColor={colors.textPrimary}
          />
          <Pressable
            accessibilityRole="button"
            onPress={() => setOpen(false)}
            style={({ pressed }) => [styles.doneBtn, pressed && { opacity: 0.7 }]}
            hitSlop={8}
          >
            <Text style={styles.doneBtnText}>Done</Text>
          </Pressable>
        </View>
      ) : null}

      {open && Platform.OS === 'android' ? (
        <DateTimePicker
          value={value ?? new Date()}
          mode="date"
          display="default"
          onChange={handleChange}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
        />
      ) : null}

      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : hint ? (
        <Text style={styles.hint}>{hint}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.lg },
  label: {
    ...typography.micro,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  inputPressed: { borderColor: colors.accent },
  inputError: { borderColor: colors.danger },
  value: { ...typography.body, color: colors.textPrimary, flex: 1 },
  placeholder: { color: colors.textMuted },
  chev: { ...typography.bodyStrong, color: colors.textSecondary, marginLeft: spacing.sm },
  iosPicker: {
    marginTop: spacing.sm,
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  doneBtn: {
    alignSelf: 'flex-end',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
    marginTop: spacing.xs,
  },
  doneBtnText: { ...typography.bodyStrong, color: colors.accentInk },
  hint: { ...typography.caption, color: colors.textMuted, marginTop: spacing.xs },
  errorText: { ...typography.caption, color: colors.danger, marginTop: spacing.xs },
});
