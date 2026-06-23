import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { colors, radius } from '@/theme/tokens';

export type GlassVariant = 'bar' | 'item' | 'circle';

const PRESETS: Record<
  GlassVariant,
  { borderRadius: number; intensity: number; overlay: string; border: string; specular: string }
> = {
  bar: {
    borderRadius: radius.xl,
    intensity: 72,
    overlay: 'rgba(255,255,255,0.5)',
    border: 'rgba(255,255,255,0.38)',
    specular: 'rgba(255,255,255,0.88)',
  },
  item: {
    borderRadius: radius.pill,
    intensity: 48,
    overlay: 'rgba(255,255,255,0.62)',
    border: 'rgba(255,255,255,0.34)',
    specular: 'rgba(255,255,255,0.78)',
  },
  circle: {
    borderRadius: radius.pill,
    intensity: 44,
    overlay: 'rgba(255,255,255,0.56)',
    border: 'rgba(255,255,255,0.36)',
    specular: 'rgba(255,255,255,0.82)',
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

  return (
    <View style={[styles.shell, { borderRadius: cornerRadius }, style]}>
      {Platform.OS === 'web' ? (
        <View
          style={[
            StyleSheet.absoluteFill,
            styles.fallback,
            { borderRadius: cornerRadius, backgroundColor: colors.surfaceGlass },
          ]}
        />
      ) : (
        <BlurView
          intensity={blurIntensity}
          tint="light"
          style={[StyleSheet.absoluteFill, { borderRadius: cornerRadius }]}
        />
      )}
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
}

interface GlassLensProps {
  style?: StyleProp<ViewStyle>;
}

/** Active menu/tab highlight — frosted lens without nested blur. */
export function GlassLens({ style }: GlassLensProps) {
  return (
    <View pointerEvents="none" style={[styles.lens, style]}>
      <View style={styles.lensSpecular} />
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 24,
      },
      android: { elevation: 10 },
      default: {},
    }),
  },
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
  },
  lens: {
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.55)',
    borderRadius: radius.pill,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: { elevation: 2 },
      default: {},
    }),
  },
  lensSpecular: {
    position: 'absolute',
    top: 0,
    left: 12,
    right: 12,
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
});
