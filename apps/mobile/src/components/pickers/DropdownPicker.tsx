import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
  type View as ViewType,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getDropdownListMaxHeight } from '@/theme/layout';
import { spacing } from '@/theme';
import { pickerStyles as styles, OPTIONS_MAX_HEIGHT } from './pickerStyles';

export type PickerOption<T extends string> = {
  value: T;
  label: string;
};

type DropdownPickerBaseProps<T extends string> = {
  label: string;
  hint?: string;
  placeholder: string;
  options: PickerOption<T>[];
  onOpenChange?: (open: boolean) => void;
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
  const { label, hint, placeholder, options, onOpenChange } = props;
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [listMaxHeight, setListMaxHeight] = useState(OPTIONS_MAX_HEIGHT);
  const [useModalSheet, setUseModalSheet] = useState(false);
  const triggerRef = useRef<ViewType>(null);
  const isMultiple = props.multiple === true;

  function setDropdownOpen(next: boolean) {
    setOpen(next);
    onOpenChange?.(next);
  }

  const remeasureList = useCallback(() => {
    if (!triggerRef.current) return;
    triggerRef.current.measureInWindow((_x, y, _w, h) => {
      const extraChrome = isMultiple ? 52 : 0;
      const layout = getDropdownListMaxHeight({
        windowHeight,
        triggerY: y,
        triggerHeight: h,
        safeBottom: insets.bottom,
        optionCount: options.length,
        extraChrome,
      });
      setListMaxHeight(layout.maxHeight);
      setUseModalSheet(layout.useModalSheet);
    });
  }, [insets.bottom, isMultiple, options.length, windowHeight]);

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(remeasureList, 0);
    return () => clearTimeout(timer);
  }, [open, remeasureList, windowWidth, windowHeight]);

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
    setDropdownOpen(false);
  }

  function isSelected(option: PickerOption<T>): boolean {
    if (isMultiple) return props.value.includes(option.value);
    return props.value === option.value;
  }

  const optionsList = (
    <ScrollView
      style={[styles.dropdownOptionsScroll, { maxHeight: listMaxHeight }]}
      contentContainerStyle={styles.dropdownOptionsContent}
      keyboardShouldPersistTaps="handled"
      nestedScrollEnabled
      showsVerticalScrollIndicator
      bounces={options.length * 48 > listMaxHeight}
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
            <Text style={[styles.dropdownOptionText, active && styles.dropdownOptionTextActive]}>
              {isMultiple ? `${active ? '✓' : ' '} ${option.label}` : option.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );

  return (
    <View style={[styles.dropdownWrap, open && !useModalSheet && styles.dropdownWrapOpen]}>
      <Text style={styles.label}>{label}</Text>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      <View ref={triggerRef} collapsable={false}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${label}, ${hasValue ? displayValue : placeholder}`}
          onPress={() => {
            const next = !open;
            if (next) remeasureList();
            setDropdownOpen(next);
          }}
          onLayout={() => {
            if (open) remeasureList();
          }}
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
      </View>

      {open && !useModalSheet ? (
        <View style={[styles.dropdownList, { maxHeight: listMaxHeight + (isMultiple ? 52 : 0) }]}>
          {isMultiple ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Done selecting options"
              onPress={() => setDropdownOpen(false)}
              style={({ pressed }) => [styles.doneBtn, pressed && styles.doneBtnPressed]}
            >
              <Text style={styles.doneBtnText}>
                {hasValue ? `Done (${props.value.length} selected)` : 'Done'}
              </Text>
            </Pressable>
          ) : null}
          {optionsList}
        </View>
      ) : null}

      <Modal
        visible={open && useModalSheet}
        transparent
        animationType="slide"
        onRequestClose={() => setDropdownOpen(false)}
      >
        <View style={styles.modalRoot}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close options"
            style={styles.modalBackdrop}
            onPress={() => setDropdownOpen(false)}
          />
          <View style={[styles.modalSheet, { paddingBottom: insets.bottom + spacing.md }]}>
            <Text style={styles.modalTitle}>{label}</Text>
            {isMultiple ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Done selecting options"
                onPress={() => setDropdownOpen(false)}
                style={({ pressed }) => [styles.doneBtn, pressed && styles.doneBtnPressed]}
              >
                <Text style={styles.doneBtnText}>
                  {hasValue ? `Done (${props.value.length} selected)` : 'Done'}
                </Text>
              </Pressable>
            ) : null}
            <View style={[styles.modalList, { maxHeight: listMaxHeight + (isMultiple ? 52 : 0) }]}>
              {optionsList}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function formatDefaultLabels<T extends string>(values: T[], options: PickerOption<T>[]): string {
  return values
    .map(value => options.find(option => option.value === value)?.label ?? value)
    .join(', ');
}
