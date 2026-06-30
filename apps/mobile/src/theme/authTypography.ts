import { typography } from './tokens';

/** Auth UI font sizes — always sourced from global typography tokens. */
export const authTypography = {
  inputFontSize: typography.body.fontSize,
  inputLineHeight: typography.body.lineHeight,
  labelFontSize: typography.micro.fontSize,
  /** Tight tracking for field labels (EMAIL, PASSWORD) — no per-letter gaps. */
  labelLetterSpacing: 0,
  helperFontSize: typography.caption.fontSize,
  helperLineHeight: typography.caption.lineHeight,
  ctaFontSize: typography.bodyStrong.fontSize,
  footerFontSize: typography.caption.fontSize,
  segmentFontSize: typography.bodyStrong.fontSize,
  wordmarkFontSize: typography.title.fontSize,
  taglineFontSize: typography.micro.fontSize,
  taglineLetterSpacing: typography.micro.letterSpacing,
  linkFontSize: typography.bodyStrong.fontSize,
  errorFontSize: typography.caption.fontSize,
} as const;

/** Uppercase auth field labels without wide letter-spacing. */
export const authFieldLabelStyle = {
  fontFamily: typography.micro.fontFamily,
  fontSize: authTypography.labelFontSize,
  fontWeight: typography.micro.fontWeight,
  letterSpacing: authTypography.labelLetterSpacing,
  textTransform: 'uppercase' as const,
};
