// Plus Jakarta Sans — the app typeface. React Native (especially Android)
// ignores `fontWeight` once a custom `fontFamily` is set, so each weight is a
// separate registered family. The `fontFamily.*` strings are referenced from
// the typography tokens; `fontAssets` is what we hand to `useFonts`.
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';

export const fontFamily = {
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semibold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
  extrabold: 'PlusJakartaSans_800ExtraBold',
} as const;

/** Map handed to `useFonts` in the root layout. */
export const fontAssets = {
  [fontFamily.regular]: PlusJakartaSans_400Regular,
  [fontFamily.medium]: PlusJakartaSans_500Medium,
  [fontFamily.semibold]: PlusJakartaSans_600SemiBold,
  [fontFamily.bold]: PlusJakartaSans_700Bold,
  [fontFamily.extrabold]: PlusJakartaSans_800ExtraBold,
} as const;
