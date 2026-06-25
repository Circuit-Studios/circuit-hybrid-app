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
import { authInputChrome } from '@/theme/authInputChrome';
import { authFieldLabelStyle } from '@/theme/authTypography';
import { authFieldRowStyleFromMetrics, authInputTextStyle, type AuthFieldVariant } from '@/theme/fields';
import { useAuthMetrics } from '@/features/auth/AuthMetricsContext';
import { colors, radius, spacing, typography } from '@/theme';

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
  fieldVariant?: AuthFieldVariant;
  hideLabel?: boolean;
  placeholder?: string;
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
  fieldVariant = 'signIn',
  hideLabel = false,
  placeholder = '10-digit mobile number',
}: PhoneFieldProps) {
  const [focused, setFocused] = useState(false);
  const metrics = useAuthMetrics(fieldVariant === 'signUp' ? 'signUp' : 'signIn');
  const fieldHeight = metrics.inputHeight;
  const gap = metrics.fieldGap;
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
    <View style={[styles.wrap, { marginBottom: gap }, containerStyle]}>
      {!hideLabel ? <Text style={styles.label}>{label}</Text> : null}
      <View
        style={[
          authFieldRowStyleFromMetrics(metrics),
          styles.row,
          authInputChrome.base,
          focused && !error ? authInputChrome.focused : null,
          error ? authInputChrome.error : null,
        ]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Country code, ${countryName(country)}, ${dialCode(country)}`}
          onPress={() => setPickerOpen(true)}
          style={({ pressed }) => [
            styles.countryBtn,
            { height: fieldHeight },
            pressed && styles.countryBtnPressed,
          ]}
        >
          <CountryFlag code={country} size={20} />
          <Text style={styles.dial}>{dialCode(country)}</Text>
          <Text style={styles.chev}>▾</Text>
        </Pressable>
        <View style={styles.divider} />
        <TextInput
          style={styles.input}
          value={nationalNumber}
          onChangeText={updateNational}
          placeholder={placeholder}
          placeholderTextColor={authPalette.inputPlaceholder}
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
        <Text style={styles.hint}>{statusHint}</Text>
      ) : hint ? (
        <Text style={styles.hint}>{hint}</Text>
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
  wrap: {},
  label: {
    ...authFieldLabelStyle,
    color: authPalette.label,
    marginBottom: 8,
  },
  row: {
    overflow: 'hidden',
  },
  countryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
  },
  countryBtnPressed: { opacity: 0.85 },
  dial: { ...typography.bodyStrong, color: authPalette.inputText },
  chev: { ...typography.caption, color: authPalette.muted, marginLeft: 2 },
  divider: {
    width: 1,
    alignSelf: 'stretch',
    backgroundColor: authPalette.inputBorder,
    marginVertical: spacing.sm,
  },
  input: {
    flex: 1,
    color: authPalette.inputText,
    paddingHorizontal: spacing.md,
    ...authInputTextStyle,
  },
  hint: {
    ...typography.caption,
    color: authPalette.segmentInactiveText,
    marginTop: 8,
  },
  errorText: { ...typography.caption, color: authPalette.error, marginTop: spacing.xs },
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
