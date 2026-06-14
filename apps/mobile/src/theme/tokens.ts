// Core design tokens — Circuit v1 orange/glass light theme.

export const colors = {
  // Brand — orange→amber
  brand: '#F47A1F',
  brandStrong: '#E8650C',
  brandSoft: 'rgba(244,122,31,0.12)',
  amber: '#F9B233',
  amberLight: '#FCC55A',

  // Hero gradient (top → bottom)
  heroFrom: '#FFA033',
  heroMid: '#F2790E',
  heroTo: '#140D06',

  // Neutrals (light theme)
  bg: '#ECECEC',
  bgElevated: '#F5F5F5',
  surface: '#FFFFFF',
  surfaceGlass: 'rgba(255,255,255,0.72)',
  surfaceElevated: '#FFFFFF',
  surfaceMuted: 'rgba(0,0,0,0.05)',
  glass: 'rgba(255,255,255,0.72)',
  glassBorder: 'rgba(0,0,0,0.06)',
  border: 'rgba(0,0,0,0.06)',
  borderSubtle: 'rgba(0,0,0,0.04)',

  textPrimary: '#141414',
  textSecondary: '#5C5C5C',
  textMuted: '#9B9B9B',
  onBrand: '#FFFFFF',

  // Backward-compatible aliases (used across existing screens)
  accent: '#F47A1F',
  accentLight: '#FCC55A',
  accentMuted: '#E8650C',
  accentSoft: 'rgba(244,122,31,0.12)',
  accentGlow: 'rgba(244,122,31,0.35)',
  accentInk: '#FFFFFF',

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
