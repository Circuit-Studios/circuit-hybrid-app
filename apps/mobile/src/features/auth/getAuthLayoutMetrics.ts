import { authTypography } from '@/theme/authTypography';

export type AuthScreenMode = 'signIn' | 'signUp';

export interface AuthLayoutMetricsInput {
  width: number;
  height: number;
  safeAreaTop: number;
  safeAreaBottom: number;
  isLandscape: boolean;
  isSmallPhone: boolean;
  isShortHeight: boolean;
  isVeryShortHeight: boolean;
  isTablet: boolean;
  mode: AuthScreenMode;
}

export interface AuthLayoutMetrics {
  horizontalPadding: number;
  contentMaxWidth: number;
  topPadding: number;
  headerTopMargin: number;
  logoRingSize: number;
  logoInnerSize: number;
  wordmarkFontSize: number;
  subtitleFontSize: number;
  subtitleLetterSpacing: number;
  headerBottomMargin: number;
  segmentHeight: number;
  segmentInnerHeight: number;
  segmentMarginTop: number;
  segmentMarginBottom: number;
  formMarginTop: number;
  inputHeight: number;
  inputRadius: number;
  inputFontSize: number;
  labelFontSize: number;
  labelLetterSpacing: number;
  labelMarginBottom: number;
  fieldGap: number;
  forgotMarginTop: number;
  helperFontSize: number;
  helperLineHeight: number;
  ctaHeight: number;
  ctaRadius: number;
  ctaFontSize: number;
  ctaMarginTop: number;
  footerMarginTop: number;
  footerFontSize: number;
  bottomPadding: number;
  stickyFooterHeight: number;
  stickyFooterLinkHeight: number;
  stickyFooterPaddingTop: number;
  stickyCtaBottomOffset: number;
  signupScrollPaddingBottom: number;
  scrollBottomReserve: number;
  isLandscapeTwoColumn: boolean;
  brandColumnWidth?: number;
  formColumnWidth?: number;
  columnGap?: number;
  totalMaxWidth?: number;
  hideSubtitle: boolean;
  hideCameraWatermark: boolean;
  hideStickyFooterLink: boolean;
  watermarkScale: number;
  watermarkOpacityMultiplier: number;
  useShortPasswordHelper: boolean;
  phoneHelperShort: boolean;
}

const FOOTER_LINK_HEIGHT = 32;

/** Derives responsive spacing/sizing for auth screens. */
export function getAuthLayoutMetrics(input: AuthLayoutMetricsInput): AuthLayoutMetrics {
  const {
    mode,
    safeAreaTop,
    safeAreaBottom,
    width,
    height,
    isLandscape,
    isSmallPhone,
    isShortHeight,
    isVeryShortHeight,
    isTablet,
  } = input;

  const isSignUp = mode === 'signUp';
  const isLandscapeWide = isLandscape && width >= 700;
  const isLandscapeTight = isLandscape && height < 430;

  let horizontalPadding = 24;
  let contentMaxWidth = isTablet ? (isLandscape ? 920 : 520) : 620;
  let headerTopMargin = isSignUp ? 8 : 12;
  let logoRingSize = 74;
  let logoInnerSize = 46;
  let wordmarkFontSize = authTypography.wordmarkFontSize;
  let subtitleFontSize = authTypography.taglineFontSize;
  let subtitleLetterSpacing = authTypography.taglineLetterSpacing;
  let headerBottomMargin = isSignUp ? 16 : 20;
  let segmentHeight = isSignUp ? 44 : 50;
  let segmentMarginTop = isSignUp ? 16 : 28;
  let segmentMarginBottom = isSignUp ? 18 : 0;
  let formMarginTop = isSignUp ? 0 : 30;
  let inputHeight = 54;
  let inputRadius = 15;
  const inputFontSize = authTypography.inputFontSize;
  const labelFontSize = authTypography.labelFontSize;
  const labelLetterSpacing = authTypography.labelLetterSpacing;
  let labelMarginBottom = 8;
  let fieldGap = 12;
  let forgotMarginTop = 16;
  const helperFontSize = authTypography.helperFontSize;
  const helperLineHeight = authTypography.helperLineHeight;
  let ctaHeight = 58;
  let ctaRadius = 20;
  const ctaFontSize = authTypography.ctaFontSize;
  let ctaMarginTop = 34;
  let footerMarginTop = isSignUp ? 10 : 24;
  const footerFontSize = authTypography.footerFontSize;
  let bottomPadding = 28;
  let hideSubtitle = false;
  let hideCameraWatermark = false;
  let hideStickyFooterLink = false;
  let watermarkScale = 1;
  let watermarkOpacityMultiplier = 1;
  let useShortPasswordHelper = false;
  let phoneHelperShort = false;

  let isLandscapeTwoColumn = false;
  let brandColumnWidth: number | undefined;
  let formColumnWidth: number | undefined;
  let columnGap: number | undefined;
  let totalMaxWidth: number | undefined;

  if (isSmallPhone) {
    horizontalPadding = 18;
    logoRingSize = 66;
    logoInnerSize = Math.round(logoRingSize * 0.62);
    segmentHeight = 40;
    inputHeight = 48;
    fieldGap = 10;
    ctaHeight = 52;
    watermarkScale = 0.85;
    watermarkOpacityMultiplier = 0.75;
    phoneHelperShort = true;
  }

  if (isShortHeight) {
    headerTopMargin -= 10;
    headerBottomMargin -= 8;
    segmentMarginTop -= 8;
    fieldGap = Math.max(6, fieldGap - 3);
    ctaMarginTop -= 6;
    footerMarginTop -= 4;
  }

  if (isVeryShortHeight && isSignUp) {
    segmentHeight = 40;
    ctaHeight = 46;
    hideSubtitle = true;
    useShortPasswordHelper = true;
    watermarkOpacityMultiplier *= 0.7;
    hideStickyFooterLink = true;
  }

  if (isLandscapeWide) {
    isLandscapeTwoColumn = true;
    totalMaxWidth = 920;
    brandColumnWidth = 340;
    formColumnWidth = 420;
    columnGap = 44;
    contentMaxWidth = 920;

    logoRingSize = 54;
    logoInnerSize = 34;
    segmentHeight = 40;
    inputHeight = 40;
    ctaHeight = 48;
    headerBottomMargin = 12;
    segmentMarginTop = 0;
    formMarginTop = 0;
    watermarkOpacityMultiplier *= 0.85;
  }

  if (isLandscapeTight) {
    hideCameraWatermark = true;
    hideSubtitle = true;
    headerBottomMargin = 8;
    segmentMarginTop = 4;
    hideStickyFooterLink = true;
  }

  const segmentInnerHeight = Math.max(32, segmentHeight - 8);
  const stickyFooterLinkHeight = isSignUp || hideStickyFooterLink ? 0 : FOOTER_LINK_HEIGHT;
  const stickyFooterPaddingTop = isSignUp ? 6 : 0;
  /** Extra space below CTA (above home indicator) — larger value sits the button higher. */
  const stickyCtaBottomOffset = isSignUp ? (safeAreaBottom > 0 ? 28 : 16) : 12;
  const stickyFooterHeight = ctaHeight + stickyFooterLinkHeight;
  const signupScrollPaddingBottom = isSignUp ? 12 : 0;
  const scrollBottomReserve = isSignUp ? 0 : 12;

  return {
    horizontalPadding,
    contentMaxWidth,
    topPadding: safeAreaTop + (isSignUp ? 16 : 18),
    headerTopMargin: Math.max(0, headerTopMargin),
    logoRingSize,
    logoInnerSize,
    wordmarkFontSize,
    subtitleFontSize,
    subtitleLetterSpacing,
    headerBottomMargin: Math.max(8, headerBottomMargin),
    segmentHeight,
    segmentInnerHeight,
    segmentMarginTop: Math.max(0, segmentMarginTop),
    segmentMarginBottom: Math.max(0, segmentMarginBottom),
    formMarginTop,
    inputHeight,
    inputRadius,
    inputFontSize,
    labelFontSize,
    labelLetterSpacing,
    labelMarginBottom,
    fieldGap,
    forgotMarginTop,
    helperFontSize,
    helperLineHeight,
    ctaHeight,
    ctaRadius,
    ctaFontSize,
    ctaMarginTop: Math.max(8, ctaMarginTop),
    footerMarginTop: Math.max(8, footerMarginTop),
    footerFontSize,
    bottomPadding,
    stickyFooterHeight,
    stickyFooterLinkHeight,
    stickyFooterPaddingTop,
    stickyCtaBottomOffset,
    signupScrollPaddingBottom,
    scrollBottomReserve,
    isLandscapeTwoColumn,
    brandColumnWidth,
    formColumnWidth,
    columnGap,
    totalMaxWidth,
    hideSubtitle,
    hideCameraWatermark,
    hideStickyFooterLink,
    watermarkScale,
    watermarkOpacityMultiplier,
    useShortPasswordHelper,
    phoneHelperShort,
  };
}

/** Responsive auth layout metrics — portrait, compact portrait, landscape-wide. */
export function getAuthMetrics(
  width: number,
  height: number,
  safeTop: number,
  safeBottom: number,
  mode: AuthScreenMode,
): AuthLayoutMetrics {
  return getAuthLayoutMetrics({
    width,
    height,
    safeAreaTop: safeTop,
    safeAreaBottom: safeBottom,
    isLandscape: width > height,
    isSmallPhone: width < 390,
    isShortHeight: height < 760,
    isVeryShortHeight: height < 680,
    isTablet: width >= 768,
    mode,
  });
}
