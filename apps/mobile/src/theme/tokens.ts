// Core design tokens — Circuit v1 gold/glass light theme.

export const colors = {
  // Brand — vivid golden yellow (auth mockup)
  brand: '#F5B301',
  brandStrong: '#DD9E00',
  brandSoft: 'rgba(245,179,1,0.14)',
  brandDisabled: 'rgba(245,179,1,0.30)',
  amber: '#F5B301',
  amberLight: '#FFCB3D',

  // Hero gradient (top → bottom)
  heroFrom: '#FFCB3D',
  heroMid: '#F5B301',
  heroTo: '#121212',

  // Neutrals (light theme)
  bg: '#FDFCF8',
  bgElevated: '#F5F4F0',
  surface: '#FFFFFF',
  surfaceGlass: 'rgba(255,255,255,0.72)',
  surfaceElevated: '#FFFFFF',
  surfaceMuted: 'rgba(0,0,0,0.05)',
  glass: 'rgba(255,255,255,0.72)',
  glassBorder: 'rgba(0,0,0,0.06)',
  border: 'rgba(0,0,0,0.06)',
  borderSubtle: 'rgba(0,0,0,0.04)',

  textPrimary: '#121212',
  textSecondary: '#5C5C5C',
  textMuted: '#9CA3AF',
  onBrand: '#121212',

  // Backward-compatible aliases (used across existing screens)
  accent: '#F5B301',
  accentLight: '#FFCB3D',
  accentMuted: '#DD9E00',
  accentSoft: 'rgba(245,179,1,0.14)',
  accentGlow: 'rgba(245,179,1,0.38)',
  accentInk: '#121212',

  // Semantic
  success: '#1E8E5A',
  successSoft: 'rgba(30,142,90,0.15)',
  warning: '#E0A24A',
  danger: '#C23B2E',
  dangerSoft: 'rgba(194,59,46,0.15)',
  info: '#3B82F6',

  // Health ring segment colors (vivid on light backgrounds)
  ringDirection: '#6366F1',
  ringDOP: '#0EA5E9',
  ringCostume: '#EC4899',
  ringArt: '#F97316',
  ringSound: '#8B5CF6',
  ringStunts: '#EF4444',
  ringMakeup: '#EAB308',
  ringDefault: '#94A3B8',
  ringTrack: 'rgba(0,0,0,0.08)',
} as const;

/** Auth screens — white-glassy film studio aesthetic (approved mockup). */
export const auth = {
  bg: '#FEFCFB',
  bgWarm: '#FFFEFC',
  bgGlow: '#FFF6E0',

  ink: '#111111',
  inkSoft: '#24211D',
  muted: '#807A70',
  muted2: '#A49D92',
  label: '#6E685F',

  gold: '#E7A914',
  gold2: '#F6C347',
  goldDark: '#B77B00',
  goldSoft: '#FFF2C7',

  segmentBg: 'rgba(244, 242, 237, 0.82)',
  segmentActive: '#171717',
  segmentInactiveText: '#8F8980',
  segmentActiveText: '#FFFFFF',

  fieldBg: 'rgba(255, 255, 255, 0.88)',
  fieldBorder: '#E7E0D6',
  fieldBorderFocus: '#E8A914',
  fieldText: '#24211D',
  fieldPlaceholder: '#AAA49B',
  fieldIcon: '#8F8980',

  cardBg: 'rgba(255, 255, 255, 0.82)',
  cardBorder: 'rgba(231, 224, 214, 0.9)',

  watermark: '#D8C6A3',
  watermarkDark: '#C8B58F',

  danger: '#B84A3A',

  ctaGradientStart: '#F8CE5A',
  ctaGradientMid: '#F0B629',
  ctaGradientEnd: '#E4A318',
  ctaShadow: '#D89A12',
  ctaDisabled: 'rgba(232, 169, 20, 0.45)',

  subtitle: '#7F7A70',
  footerLink: '#B77B00',
} as const;

/** Floating glass tab bar — yellow active highlight per app home mockup. */
export const tabBar = {
  height: 84,
  activeCircleSize: 44,
  itemTouchMin: 56,
  blurIntensity: 70,
  iconInactive: '#9CA3AF',
  iconActive: '#121212',
  iconSizeInactive: 24,
  iconSizeActive: 24,
  glassOverlay: 'rgba(255,255,255,0.08)',
  glassBorder: 'rgba(255,255,255,0.52)',
  glassSpecular: 'rgba(255,255,255,0.9)',
  glassFallback: 'rgba(255,255,255,0.92)',
  glassFallbackTint: 'rgba(255,255,255,0.45)',
  activePillFill: '#F5B301',
  activePillBorder: 'transparent',
  labelInactive: '#9CA3AF',
  labelActive: '#F5B301',
  shadow: '#000000',
  slotPressedOpacity: 0.72,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radius = {
  sm: 8,
  md: 16,
  lg: 20,
  xl: 28,
  card: 28,
  pill: 999,
} as const;

export const typography = {
  display: {
    fontSize: 34,
    fontWeight: '700' as const,
    letterSpacing: -0.8,
    lineHeight: 40,
  },
  title: {
    fontSize: 26,
    fontWeight: '700' as const,
    letterSpacing: -0.4,
    lineHeight: 32,
  },
  heading: {
    fontSize: 17,
    fontWeight: '600' as const,
    letterSpacing: -0.15,
    lineHeight: 24,
  },
  subtitle: { fontSize: 16, fontWeight: '500' as const, lineHeight: 24 },
  body: { fontSize: 15, fontWeight: '400' as const, lineHeight: 24 },
  bodyStrong: { fontSize: 15, fontWeight: '600' as const, lineHeight: 24 },
  caption: { fontSize: 13, fontWeight: '400' as const, lineHeight: 20 },
  micro: {
    fontSize: 11,
    fontWeight: '600' as const,
    letterSpacing: 1.2,
    textTransform: 'uppercase' as const,
  },
} as const;

export type Colors = typeof colors;
export type Spacing = typeof spacing;
