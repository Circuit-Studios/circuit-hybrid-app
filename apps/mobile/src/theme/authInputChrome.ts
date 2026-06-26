import { Platform, StyleSheet } from 'react-native';
import { authPalette } from './authPalette';
import { authLayout } from './authLayout';

const fieldShadow = Platform.select({
  ios: {
    shadowColor: '#1F1B14',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
  },
  android: { elevation: 1 },
  default: {},
});

const fieldFocusShadow = Platform.select({
  ios: {
    shadowColor: authPalette.inputAccent,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
  },
  android: { elevation: 2 },
  default: {},
});

/** Shared glass input chrome for auth screens. */
export const authInputChrome = StyleSheet.create({
  base: {
    backgroundColor: authPalette.inputBg,
    borderWidth: 1,
    borderColor: authPalette.inputBorder,
    borderRadius: authLayout.fieldRadius,
    ...fieldShadow,
  },
  focused: {
    borderColor: authPalette.inputAccent,
    ...fieldFocusShadow,
  },
  error: {
    borderColor: authPalette.error,
  },
});
