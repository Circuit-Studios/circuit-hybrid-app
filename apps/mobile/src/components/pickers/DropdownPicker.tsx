import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type View as ViewType,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthMetrics } from '@/features/auth/AuthMetricsContext';
import { authPalette } from '@/theme/authPalette';
import { authInputChrome } from '@/theme/authInputChrome';
import { authLayout } from '@/theme/authLayout';
import { authFieldLabelStyle } from '@/theme/authTypography';
import { dropdownLayout, getDropdownListMaxHeight } from '@/theme/layout';
import { spacing, typography } from '@/theme';
import { pickerStyles as styles, OPTIONS_MAX_HEIGHT } from './pickerStyles';

const OPTION_ROW_HEIGHT = dropdownLayout.optionRowHeight;

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
  variant?: 'default' | 'auth';
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
  const { label, hint, placeholder, options, onOpenChange, variant = 'default' } = props;
  const auth = variant === 'auth';
  const authMetrics = useAuthMetrics();
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
    const extraChrome = isMultiple ? 52 : 0;
    const fullListHeight = options.length * OPTION_ROW_HEIGHT + extraChrome;

    if (auth) {
      setUseModalSheet(true);
      setListMaxHeight(Math.min(OPTIONS_MAX_HEIGHT, fullListHeight));
      return;
    }

    if (!triggerRef.current) return;
    triggerRef.current.measureInWindow((_x, y, _w, h) => {
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
  }, [auth, insets.bottom, isMultiple, options.length, windowHeight]);

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
      options.find((option) => option.value === props.value)?.label ??
      placeholder
    );
  })();

  function toggleOption(option: PickerOption<T>) {
    if (isMultiple) {
      const { value, onChange } = props;
      if (value.includes(option.value)) {
        onChange(value.filter((item) => item !== option.value));
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

  const extraChrome = isMultiple ? 52 : 0;
  const fullListHeight = options.length * OPTION_ROW_HEIGHT + extraChrome;
  const visibleListHeight = Math.min(listMaxHeight, fullListHeight);
  const listScrollable = fullListHeight > visibleListHeight;

  const optionsList = (
    <ScrollView
      style={[styles.dropdownOptionsScroll, { height: visibleListHeight }]}
      contentContainerStyle={styles.dropdownOptionsContent}
      keyboardShouldPersistTaps="handled"
      nestedScrollEnabled
      scrollEnabled={listScrollable}
      showsVerticalScrollIndicator={listScrollable}
      bounces={listScrollable}
    >
      {options.map((option) => {
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
    <View
      style={[
        styles.dropdownWrap,
        open && !useModalSheet && styles.dropdownWrapOpen,
        auth && { marginBottom: authMetrics.fieldGap },
      ]}
    >
      <Text style={[styles.label, auth && authStyles.label]}>{label}</Text>
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
            auth && authStyles.dropdownTrigger,
            open && styles.dropdownTriggerOpen,
            open && auth && authStyles.dropdownTriggerOpen,
            pressed && styles.dropdownTriggerPressed,
            pressed && auth && authStyles.dropdownTriggerPressed,
          ]}
        >
          <Text
            style={[
              styles.dropdownValue,
              auth && authStyles.dropdownValue,
              !hasValue && styles.dropdownPlaceholder,
              !hasValue && auth && authStyles.dropdownPlaceholder,
            ]}
          >
            {displayValue}
          </Text>
          <Text style={[styles.chev, auth && authStyles.chev]}>{open ? '▾' : '›'}</Text>
        </Pressable>
      </View>

      {open && !useModalSheet ? (
        <View style={[styles.dropdownList, { height: visibleListHeight + (isMultiple ? 52 : 0) }]}>
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
            <View style={[styles.modalList, { height: visibleListHeight + (isMultiple ? 52 : 0) }]}>
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
    .map((value) => options.find((option) => option.value === value)?.label ?? value)
    .join(', ');
}

const authStyles = StyleSheet.create({
  label: {
    ...authFieldLabelStyle,
    color: authPalette.label,
    marginBottom: authLayout.labelMarginBottom,
  },
  dropdownTrigger: {
    ...authInputChrome.base,
    minHeight: authLayout.fieldHeightSignIn,
  },
  dropdownTriggerOpen: authInputChrome.focused,
  dropdownTriggerPressed: authInputChrome.focused,
  dropdownValue: { color: authPalette.inputText },
  dropdownPlaceholder: { color: authPalette.inputPlaceholder },
  chev: { color: authPalette.muted },
});
