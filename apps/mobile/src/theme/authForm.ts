import { StyleSheet } from 'react-native';
import { authPalette } from './authPalette';
import { authLayout } from './authLayout';

/** Shared layout styles for login, signup, and related auth screens. */
export const authFormStyles = StyleSheet.create({
  fieldFlush: { marginBottom: 0 },
  actions: { marginTop: 0, gap: 8 },
  submitHint: {
    fontSize: 13,
    color: authPalette.muted,
    textAlign: 'center',
    marginBottom: 8,
    marginTop: 4,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
  },
  footerText: { fontSize: 13, color: authPalette.muted },
  footerLink: { fontSize: 13, color: authPalette.footerLink, fontWeight: '700' },
  error: {
    fontSize: 13,
    color: authPalette.error,
    marginBottom: 8,
    marginTop: 4,
    textAlign: 'center',
  },
  form: {
    marginTop: authLayout.formMarginTopSignIn,
  },
  formSignUp: {
    marginTop: authLayout.formMarginTopSignUp,
  },
});
