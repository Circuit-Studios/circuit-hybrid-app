import {
  AsYouType,
  getCountries,
  getCountryCallingCode,
  parsePhoneNumberFromString,
  type CountryCode,
} from 'libphonenumber-js';

/** Markets we surface first in the country picker. */
export const POPULAR_COUNTRIES: CountryCode[] = [
  'IN',
  'US',
  'GB',
  'AE',
  'SG',
  'CA',
  'AU',
  'DE',
  'FR',
  'JP',
];

const ALL_COUNTRIES = getCountries().sort((a, b) =>
  countryName(a).localeCompare(countryName(b)),
);

export function listCountries(search = ''): CountryCode[] {
  const q = search.trim().toLowerCase();
  if (!q) {
    const popular = new Set(POPULAR_COUNTRIES);
    const rest = ALL_COUNTRIES.filter(c => !popular.has(c));
    return [...POPULAR_COUNTRIES, ...rest];
  }
  return ALL_COUNTRIES.filter(
    c =>
      countryName(c).toLowerCase().includes(q) ||
      c.toLowerCase().includes(q) ||
      `+${getCountryCallingCode(c)}`.includes(q),
  );
}

export function getDefaultCountry(): CountryCode {
  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale ?? 'en-IN';
    const region = locale.split('-')[1]?.toUpperCase();
    if (region && getCountries().includes(region as CountryCode)) {
      return region as CountryCode;
    }
  } catch {
    /* use fallback */
  }
  return 'IN';
}

export function countryName(code: CountryCode): string {
  try {
    return new Intl.DisplayNames(['en'], { type: 'region' }).of(code) ?? code;
  } catch {
    return code;
  }
}

export function countryFlag(code: CountryCode): string {
  return code
    .toUpperCase()
    .replace(/./g, char => String.fromCodePoint(127397 + char.charCodeAt(0)));
}

export function dialCode(country: CountryCode): string {
  return `+${getCountryCallingCode(country)}`;
}

/** Maximum national digits accepted in phone fields. */
export const MAX_NATIONAL_DIGITS = 10;

/** Strip to digits for parsing. */
export function digitsOnly(input: string): string {
  return input.replace(/\D/g, '');
}

/**
 * Normalize typed/pasted input to national significant digits only.
 * US/CA AsYouType may inject a leading trunk `1` into the formatted display —
 * strip it so users can still enter 10 real digits.
 */
export function normalizeNationalDigits(country: CountryCode, nationalInput: string): string {
  let digits = digitsOnly(nationalInput);
  if (!digits) return '';

  if (country === 'US' || country === 'CA') {
    const cc = getCountryCallingCode(country);
    if (digits.startsWith(String(cc))) {
      digits = digits.slice(String(cc).length);
    }
  }

  return digits.slice(0, MAX_NATIONAL_DIGITS);
}

export function countNationalDigits(country: CountryCode, nationalInput: string): number {
  return normalizeNationalDigits(country, nationalInput).length;
}

export function formatNational(country: CountryCode, nationalInput: string): string {
  const digits = normalizeNationalDigits(country, nationalInput);
  if (!digits) return '';
  return new AsYouType(country).input(digits);
}

/** E.164 string suitable for the API, or null if invalid / empty. */
export function toE164(country: CountryCode, nationalInput: string): string | null {
  const digits = normalizeNationalDigits(country, nationalInput);
  if (!digits) return null;
  const parsed = parsePhoneNumberFromString(digits, country);
  if (parsed?.isValid()) return parsed.number;
  return null;
}

export function isValidPhone(country: CountryCode, nationalInput: string): boolean {
  return toE164(country, nationalInput) !== null;
}

/** Progress / validation copy shown while the user types. */
export function getPhoneHint(country: CountryCode, nationalInput: string): string | undefined {
  const count = countNationalDigits(country, nationalInput);
  if (!count) return undefined;
  if (isValidPhone(country, nationalInput)) return undefined;

  const digits = normalizeNationalDigits(country, nationalInput);

  if (country === 'IN') {
    if (count < MAX_NATIONAL_DIGITS) {
      const remaining = MAX_NATIONAL_DIGITS - count;
      return `${remaining} more digit${remaining === 1 ? '' : 's'} needed (${count}/${MAX_NATIONAL_DIGITS})`;
    }
    if (!/^[6-9]/.test(digits)) {
      return 'Indian mobile numbers start with 6, 7, 8, or 9';
    }
    return 'Enter a valid 10-digit mobile number';
  }

  if (country === 'US' || country === 'CA') {
    if (count < MAX_NATIONAL_DIGITS) {
      const remaining = MAX_NATIONAL_DIGITS - count;
      return `${remaining} more digit${remaining === 1 ? '' : 's'} needed (${count}/${MAX_NATIONAL_DIGITS})`;
    }
  }

  if (count < 6) return undefined;
  return `Enter a valid mobile number for ${countryName(country)}`;
}

export function parseE164(e164: string): { country: CountryCode; national: string } | null {
  const parsed = parsePhoneNumberFromString(e164.trim());
  if (!parsed?.country || !parsed.nationalNumber) return null;
  return { country: parsed.country, national: parsed.nationalNumber };
}
