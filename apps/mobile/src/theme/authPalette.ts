import { auth } from './tokens';

/** Auth / sign-up screen palette — white-glassy film studio style. */
export const authPalette = {
  bg: auth.bg,
  bgWarm: auth.bgWarm,
  bgGlow: auth.bgGlow,

  brand: auth.gold,
  brand2: auth.gold2,
  brandStrong: auth.goldDark,
  brandSoft: auth.goldSoft,

  ink: auth.ink,
  inkSoft: auth.inkSoft,
  label: auth.label,
  muted: auth.muted,
  muted2: auth.muted2,
  subtitle: auth.subtitle,

  inputBg: auth.fieldBg,
  inputText: auth.fieldText,
  inputPlaceholder: auth.fieldPlaceholder,
  inputBorder: auth.fieldBorder,
  inputAccent: auth.fieldBorderFocus,
  inputIcon: auth.fieldIcon,
  inputLabel: auth.label,

  logoBg: '#FFFFFF',
  logoBorder: auth.gold,

  tabTrack: auth.segmentBg,
  segmentActive: auth.segmentActive,
  segmentInactiveText: auth.segmentInactiveText,
  segmentActiveText: auth.segmentActiveText,

  card: auth.cardBg,
  cardBorder: auth.cardBorder,

  ctaGradientStart: auth.ctaGradientStart,
  ctaGradientMid: auth.ctaGradientMid,
  ctaGradientEnd: auth.ctaGradientEnd,
  ctaShadow: auth.ctaShadow,
  ctaBgDisabled: auth.ctaDisabled,
  ctaText: auth.ink,
  ctaTextDisabled: 'rgba(17,17,17,0.38)',

  footerLink: auth.footerLink,
  error: auth.danger,
  watermark: auth.watermark,
  watermarkDark: auth.watermarkDark,

  chipBorder: auth.fieldBorder,
  chipText: auth.segmentInactiveText,
} as const;
