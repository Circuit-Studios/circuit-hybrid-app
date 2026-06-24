import { useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ViewStyle,
} from 'react-native';
import { parsePhoneNumberFromString, type CountryCode } from 'libphonenumber-js';
import { CountryFlag } from '@/components/CountryFlag';
import {
  countryName,
  dialCode,
  formatNational,
  getDefaultCountry,
  getPhoneHint,
  listCountries,
  MAX_NATIONAL_DIGITS,
  normalizeNationalDigits,
  toE164,
} from '@/lib/phone';
import { authPalette } from '@/theme/authPalette';
import { AUTH_FIELD_HEIGHT, authFieldRowStyle, authInputTextStyle } from '@/theme/fields';
import { colors, radius, spacing, typography } from '@/theme';
import type { AuthFieldTone } from '@/components/auth/AuthField';

interface PhoneFieldProps {
  label?: string;
  country: CountryCode;
  nationalNumber: string;
  onCountryChange: (country: CountryCode) => void;
  onNationalNumberChange: (formatted: string) => void;
  /** Called whenever a valid E.164 value is available (or null when invalid/empty). */
  onE164Change?: (e164: string | null) => void;
  hint?: string;
  error?: string;
  containerStyle?: ViewStyle;
  showError?: boolean;
  tone?: AuthFieldTone;
}

export function PhoneField({
  label = 'Phone number',
  country,
  nationalNumber,
  onCountryChange,
  onNationalNumberChange,
  onE164Change,
  hint,
  error: errorProp,
  containerStyle,
  showError = true,
  tone = 'dark',
}: PhoneFieldProps) {
  const dark = tone === 'dark';
  const [focused, setFocused] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [search, setSearch] = useState('');

  const countries = useMemo(() => listCountries(search), [search]);
  const progressHint = getPhoneHint(country, nationalNumber);
  const error = errorProp ?? (showError ? progressHint : undefined);
  const e164 = toE164(country, nationalNumber);
  const statusHint = !error && !e164 ? progressHint : undefined;

  function updateNational(text: string) {
    if (!text.trim()) {
      onNationalNumberChange('');
      onE164Change?.(null);
      return;
    }

    const trimmed = text.trim();
    if (trimmed.startsWith('+')) {
      const parsed = parsePhoneNumberFromString(trimmed);
      if (parsed?.country && parsed.nationalNumber) {
        onCountryChange(parsed.country);
        const nationalDigits = parsed.nationalNumber.slice(0, MAX_NATIONAL_DIGITS);
        const formatted = formatNational(parsed.country, nationalDigits);
        onNationalNumberChange(formatted);
        onE164Change?.(toE164(parsed.country, formatted));
        return;
      }
    }

    const prevDigits = normalizeNationalDigits(country, nationalNumber);
    let nextDigits = normalizeNationalDigits(country, text);

    // Backspace on a formatting character (space, dash, parens) does not change
    // digitsOnly(text) — treat that as deleting the last digit instead.
    if (
      text.length < nationalNumber.length &&
      nextDigits.length === prevDigits.length &&
      prevDigits.length > 0
    ) {
      nextDigits = prevDigits.slice(0, -1);
    }

    const formatted = nextDigits ? formatNational(country, nextDigits) : '';
    onNationalNumberChange(formatted);
    onE164Change?.(toE164(country, formatted));
  }

  function selectCountry(next: CountryCode) {
    onCountryChange(next);
    const reformatted = formatNational(next, nationalNumber);
    onNationalNumberChange(reformatted);
    onE164Change?.(toE164(next, reformatted));
    setPickerOpen(false);
    setSearch('');
  }

  return (
    <View style={[styles.wrap, containerStyle]}>
      <Text style={[styles.label, dark && styles.labelDark]}>{label}</Text>
      <View
        style={[
          styles.row,
          dark ? styles.rowDark : null,
          focused && !error ? (dark ? styles.rowFocusedDark : styles.rowFocused) : null,
          error ? styles.rowError : null,
        ]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Country code, ${countryName(country)}, ${dialCode(country)}`}
          onPress={() => setPickerOpen(true)}
          style={({ pressed }) => [styles.countryBtn, pressed && styles.countryBtnPressed]}
        >
          <CountryFlag code={country} size={20} />
          <Text style={[styles.dial, dark && styles.dialDark]}>{dialCode(country)}</Text>
          <Text style={[styles.chev, dark && styles.chevDark]}>▾</Text>
        </Pressable>
        <View style={[styles.divider, dark && styles.dividerDark]} />
        <TextInput
          style={[styles.input, dark && styles.inputDark]}
          value={nationalNumber}
          onChangeText={updateNational}
          placeholder="10-digit mobile number"
          placeholderTextColor={dark ? authPalette.inputPlaceholder : colors.textMuted}
          keyboardType="number-pad"
          autoComplete="tel"
          textContentType="telephoneNumber"
          selectionColor={authPalette.brand}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          accessibilityLabel="Mobile number"
        />
      </View>
      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : statusHint ? (
        <Text style={[styles.hint, dark && styles.hintDark]}>{statusHint}</Text>
      ) : hint ? (
        <Text style={[styles.hint, dark && styles.hintDark]}>{hint}</Text>
      ) : null}

      <Modal
        visible={pickerOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setPickerOpen(false)}
      >
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Country / region</Text>
            <Pressable onPress={() => setPickerOpen(false)} hitSlop={12}>
              <Text style={styles.modalDone}>Done</Text>
            </Pressable>
          </View>
          <TextInput
            style={styles.search}
            value={search}
            onChangeText={setSearch}
            placeholder="Search country or code"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            clearButtonMode="while-editing"
          />
          <FlatList
            data={countries}
            keyExtractor={(item) => item}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => {
              const active = item === country;
              return (
                <Pressable
                  onPress={() => selectCountry(item)}
                  style={({ pressed }) => [
                    styles.countryRow,
                    active && styles.countryRowActive,
                    pressed && styles.countryRowPressed,
                  ]}
                >
                  <View style={styles.countryRowFlag}>
                    <CountryFlag code={item} size={22} />
                  </View>
                  <Text style={styles.countryRowName}>{countryName(item)}</Text>
                  <Text style={styles.countryRowCode}>{dialCode(item)}</Text>
                </Pressable>
              );
            }}
          />
        </View>
      </Modal>
    </View>
  );
}

/** Convenience hook state for signup / invite flows. */
export function usePhoneFieldState(initialCountry?: CountryCode) {
  const [country, setCountry] = useState<CountryCode>(initialCountry ?? getDefaultCountry());
  const [nationalNumber, setNationalNumber] = useState('');
  const e164 = toE164(country, nationalNumber);
  return {
    country,
    setCountry,
    nationalNumber,
    setNationalNumber,
    e164,
    isValid: e164 !== null,
    error: getPhoneHint(country, nationalNumber),
  };
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.lg },
  label: {
    ...typography.micro,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  labelDark: { color: authPalette.label },
  row: {
    ...authFieldRowStyle,
    overflow: 'hidden',
  },
  rowDark: {
    backgroundColor: authPalette.inputBg,
    borderWidth: 1,
    borderColor: authPalette.inputBorder,
    borderBottomWidth: 2,
    borderBottomColor: authPalette.inputUnderline,
  },
  rowFocused: {
    borderColor: colors.accent,
    backgroundColor: colors.surface,
  },
  rowFocusedDark: {
    borderColor: authPalette.inputAccent,
    borderBottomColor: authPalette.inputAccent,
  },
  rowError: { borderColor: colors.danger },
  countryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    height: AUTH_FIELD_HEIGHT,
    gap: spacing.xs,
  },
  countryBtnPressed: { opacity: 0.85 },
  dial: { ...typography.bodyStrong, color: colors.textPrimary },
  dialDark: { color: authPalette.inputText },
  chev: { ...typography.caption, color: colors.textMuted, marginLeft: 2 },
  chevDark: { color: authPalette.muted },
  divider: {
    width: 1,
    alignSelf: 'stretch',
    backgroundColor: colors.glassBorder,
    marginVertical: spacing.sm,
  },
  dividerDark: { backgroundColor: 'rgba(255,255,255,0.12)' },
  input: {
    flex: 1,
    color: colors.textPrimary,
    paddingHorizontal: spacing.md,
    ...authInputTextStyle,
  },
  inputDark: { color: authPalette.inputText },
  hint: { ...typography.caption, color: colors.textMuted, marginTop: spacing.xs },
  hintDark: { color: authPalette.muted },
  errorText: { ...typography.caption, color: colors.danger, marginTop: spacing.xs },
  modal: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingTop: spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  modalTitle: { ...typography.heading, color: colors.textPrimary },
  modalDone: { ...typography.bodyStrong, color: colors.accent },
  search: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    color: colors.textPrimary,
    ...typography.body,
  },
  countryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderSubtle,
    gap: spacing.md,
  },
  countryRowActive: { backgroundColor: colors.accentSoft },
  countryRowPressed: { opacity: 0.9 },
  countryRowFlag: { width: 32 },
  countryRowName: { ...typography.body, color: colors.textPrimary, flex: 1 },
  countryRowCode: { ...typography.bodyStrong, color: colors.textSecondary },
});
