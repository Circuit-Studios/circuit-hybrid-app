import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { BlurView, type BlurTint } from 'expo-blur';
import { colors, radius, tabBar } from '@/theme/tokens';

export type GlassVariant = 'bar' | 'item' | 'circle' | 'tabBar';

function isNativeBlurAvailable(): boolean {
  if (Platform.OS === 'web') return false;
  const expo = (globalThis as { expo?: { getViewConfig?: (m: string, v?: string) => unknown } })
    .expo;
  return expo?.getViewConfig?.('ExpoBlur', 'ExpoBlurView') != null;
}

type GlassPreset = {
  borderRadius: number;
  intensity: number;
  blurTint: BlurTint;
  overlay: string;
  border: string;
  specular: string;
  fallback: string;
  floating?: boolean;
};

const PRESETS: Record<GlassVariant, GlassPreset> = {
  bar: {
    borderRadius: radius.xl,
    intensity: 72,
    blurTint: 'light',
    overlay: 'rgba(255,255,255,0.5)',
    border: 'rgba(255,255,255,0.38)',
    specular: 'rgba(255,255,255,0.88)',
    fallback: colors.surfaceGlass,
  },
  item: {
    borderRadius: radius.pill,
    intensity: 48,
    blurTint: 'light',
    overlay: 'rgba(255,255,255,0.62)',
    border: 'rgba(255,255,255,0.34)',
    specular: 'rgba(255,255,255,0.78)',
    fallback: 'rgba(255,255,255,0.68)',
  },
  circle: {
    borderRadius: radius.pill,
    intensity: 44,
    blurTint: 'light',
    overlay: 'rgba(255,255,255,0.56)',
    border: 'rgba(255,255,255,0.36)',
    specular: 'rgba(255,255,255,0.82)',
    fallback: 'rgba(255,255,255,0.62)',
  },
  /** Instagram-style floating nav — neutral black/white glass, content shows through. */
  tabBar: {
    borderRadius: radius.pill,
    intensity: tabBar.blurIntensity,
    blurTint: Platform.OS === 'ios' ? 'systemChromeMaterialLight' : 'extraLight',
    overlay: tabBar.glassOverlay,
    border: tabBar.glassBorder,
    specular: tabBar.glassSpecular,
    fallback: tabBar.glassFallback,
    floating: true,
  },
};

interface GlassSurfaceProps {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  borderRadius?: number;
  intensity?: number;
  variant?: GlassVariant;
}

/** Frosted glass container — iOS liquid-glass style with blur + specular edge. */
export function GlassSurface({
  children,
  style,
  borderRadius,
  intensity,
  variant = 'bar',
}: GlassSurfaceProps) {
  const preset = PRESETS[variant];
  const cornerRadius = borderRadius ?? preset.borderRadius;
  const blurIntensity = intensity ?? preset.intensity;
  const blurAvailable = isNativeBlurAvailable();

  const glassBody = (
    <View
      style={[
        styles.shell,
        { borderRadius: cornerRadius },
        !preset.floating && styles.shellShadow,
        style,
      ]}
    >
      {blurAvailable ? (
        <BlurView
          intensity={blurIntensity}
          tint={preset.blurTint}
          blurMethod={Platform.OS === 'android' ? 'dimezisBlurViewSdk31Plus' : undefined}
          blurReductionFactor={Platform.OS === 'android' ? 2 : undefined}
          style={[StyleSheet.absoluteFill, { borderRadius: cornerRadius }]}
        />
      ) : (
        <View
          style={[
            StyleSheet.absoluteFill,
            styles.fallback,
            { borderRadius: cornerRadius, backgroundColor: preset.fallback },
          ]}
        />
      )}
      {!blurAvailable && preset.floating ? (
        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            {
              borderRadius: cornerRadius,
              backgroundColor: tabBar.glassFallbackTint,
            },
          ]}
        />
      ) : null}
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          { borderRadius: cornerRadius, backgroundColor: preset.overlay },
        ]}
      />
      <View
        pointerEvents="none"
        style={[styles.specular, { borderRadius: cornerRadius, borderTopColor: preset.specular }]}
      />
      <View style={[styles.content, { borderRadius: cornerRadius, borderColor: preset.border }]}>
        {children}
      </View>
    </View>
  );

  if (preset.floating) {
    return <View style={[styles.floatingWrap, styles.tabBarShadow]}>{glassBody}</View>;
  }

  return glassBody;
}

interface GlassLensProps {
  style?: StyleProp<ViewStyle>;
}

/** Active menu/tab highlight — frosted lens without nested blur. */
export function GlassLens({ style }: GlassLensProps) {
  return (
    <View pointerEvents="none" style={[styles.lens, style]}>
      <View style={styles.lensSheen} />
      <View style={styles.lensSpecular} />
    </View>
  );
}

const styles = StyleSheet.create({
  floatingWrap: {
    alignSelf: 'center',
    alignItems: 'center',
  },
  tabBarShadow: Platform.select({
    ios: {
      shadowColor: tabBar.shadow,
      shadowOffset: { width: 0, height: 14 },
      shadowOpacity: 0.14,
      shadowRadius: 28,
    },
    android: { elevation: 12 },
    default: {},
  }),
  shell: {
    overflow: 'hidden',
  },
  shellShadow: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.1,
      shadowRadius: 24,
    },
    android: { elevation: 10 },
    default: {},
  }),
  fallback: {
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  specular: {
    ...StyleSheet.absoluteFill,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  content: {
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  lens: {
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.06)',
    borderRadius: radius.pill,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
      },
      android: { elevation: 1 },
      default: {},
    }),
  },
  lensSheen: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  lensSpecular: {
    position: 'absolute',
    top: 0,
    left: 14,
    right: 14,
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.95)',
  },
});
