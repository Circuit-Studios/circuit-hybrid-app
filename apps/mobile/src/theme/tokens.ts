// Core design tokens — Circuit v1 gold/glass light theme.

export const colors = {
  // Brand — golden yellow (auth mockup)
  brand: '#E8B931',
  brandStrong: '#D4A628',
  brandSoft: 'rgba(232,185,49,0.14)',
  brandDisabled: 'rgba(232,185,49,0.28)',
  amber: '#E8B931',
  amberLight: '#F0C94A',

  // Hero gradient (top → bottom)
  heroFrom: '#F0C94A',
  heroMid: '#E8B931',
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
  accent: '#E8B931',
  accentLight: '#F0C94A',
  accentMuted: '#D4A628',
  accentSoft: 'rgba(232,185,49,0.14)',
  accentGlow: 'rgba(232,185,49,0.38)',
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

/** Floating glass tab bar — Instagram-style neutral dock. */
export const tabBar = {
  height: 80,
  activePillWidth: 88,
  activePillHeight: 44,
  blurIntensity: 70,
  iconInactive: '#6B7280',
  iconActive: '#121212',
  iconSizeInactive: 24,
  iconSizeActive: 22,
  glassOverlay: 'rgba(255,255,255,0.08)',
  glassBorder: 'rgba(255,255,255,0.52)',
  glassSpecular: 'rgba(255,255,255,0.9)',
  glassFallback: 'rgba(255,255,255,0.78)',
  activePillFill: 'rgba(255,255,255,0.72)',
  activePillBorder: 'rgba(0,0,0,0.06)',
  shadow: '#000000',
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
