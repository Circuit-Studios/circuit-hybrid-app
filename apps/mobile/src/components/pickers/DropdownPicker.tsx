import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { pickerStyles as styles } from './pickerStyles';

const OPTIONS_MAX_HEIGHT = 240;

export type PickerOption<T extends string> = {
  value: T;
  label: string;
};

type DropdownPickerBaseProps<T extends string> = {
  label: string;
  hint?: string;
  placeholder: string;
  options: PickerOption<T>[];
};

export type DropdownPickerProps<T extends string> = DropdownPickerBaseProps<T> &
  (
    | {
        multiple?: false;
        value: T | null;
        onChange: (value: T) => void;
        formatDisplayValue?: (value: T) => string;
      }
    | {
        multiple: true;
        value: T[];
        onChange: (value: T[]) => void;
        formatDisplayValue?: (value: T[]) => string;
      }
  );

export function DropdownPicker<T extends string>(props: DropdownPickerProps<T>) {
  const { label, hint, placeholder, options } = props;
  const [open, setOpen] = useState(false);
  const isMultiple = props.multiple === true;

  const hasValue = isMultiple ? props.value.length > 0 : props.value !== null;
  const displayValue = (() => {
    if (isMultiple) {
      if (!hasValue) return placeholder;
      return props.formatDisplayValue?.(props.value) ?? formatDefaultLabels(props.value, options);
    }
    if (!props.value) return placeholder;
    return (
      props.formatDisplayValue?.(props.value) ??
      options.find(option => option.value === props.value)?.label ??
      placeholder
    );
  })();

  function toggleOption(option: PickerOption<T>) {
    if (isMultiple) {
      const { value, onChange } = props;
      if (value.includes(option.value)) {
        onChange(value.filter(item => item !== option.value));
      } else {
        onChange([...value, option.value]);
      }
      return;
    }
    props.onChange(option.value);
    setOpen(false);
  }

  function isSelected(option: PickerOption<T>): boolean {
    if (isMultiple) return props.value.includes(option.value);
    return props.value === option.value;
  }

  return (
    <View style={[styles.dropdownWrap, open && styles.dropdownWrapOpen]}>
      <Text style={styles.label}>{label}</Text>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}, ${hasValue ? displayValue : placeholder}`}
        onPress={() => setOpen(prev => !prev)}
        style={({ pressed }) => [
          styles.dropdownTrigger,
          open && styles.dropdownTriggerOpen,
          pressed && styles.dropdownTriggerPressed,
        ]}
      >
        <Text style={[styles.dropdownValue, !hasValue && styles.dropdownPlaceholder]}>
          {displayValue}
        </Text>
        <Text style={styles.chev}>{open ? '▾' : '›'}</Text>
      </Pressable>

      {open ? (
        <View style={styles.dropdownList}>
          {isMultiple ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Done selecting languages"
              onPress={() => setOpen(false)}
              style={({ pressed }) => [styles.doneBtn, pressed && styles.doneBtnPressed]}
            >
              <Text style={styles.doneBtnText}>
                {hasValue ? `Done (${props.value.length} selected)` : 'Done'}
              </Text>
            </Pressable>
          ) : null}
          <ScrollView
            style={[styles.dropdownOptionsScroll, { maxHeight: OPTIONS_MAX_HEIGHT }]}
            contentContainerStyle={styles.dropdownOptionsContent}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
          >
            {options.map(option => {
              const active = isSelected(option);
              return (
                <Pressable
                  key={option.value}
                  onPress={() => toggleOption(option)}
                  accessibilityRole={isMultiple ? 'checkbox' : 'menuitem'}
                  accessibilityState={isMultiple ? { checked: active } : { selected: active }}
                  style={({ pressed }) => [
                    styles.dropdownOption,
                    active && styles.dropdownOptionActive,
                    pressed && styles.dropdownOptionPressed,
                  ]}
                >
                  <Text
                    style={[styles.dropdownOptionText, active && styles.dropdownOptionTextActive]}
                  >
                    {isMultiple ? `${active ? '✓' : ' '} ${option.label}` : option.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
}

function formatDefaultLabels<T extends string>(
  values: T[],
  options: PickerOption<T>[],
): string {
  return values
    .map(value => options.find(option => option.value === value)?.label ?? value)
    .join(', ');
}
