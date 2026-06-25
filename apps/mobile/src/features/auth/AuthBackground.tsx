import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';
import type { AuthLayoutMetrics } from '@/features/auth/getAuthLayoutMetrics';
import { authPalette } from '@/theme/authPalette';

const STROKE = authPalette.watermark;
const STROKE_WIDTH = 1.2;

function FilmStripMark({ width }: { width: number }) {
  const height = Math.round(width * 1.62);
  return (
    <Svg width={width} height={height} viewBox="0 0 130 210" fill="none">
      <Rect x={28} y={8} width={74} height={194} rx={14} stroke={STROKE} strokeWidth={STROKE_WIDTH} />
      {[24, 52, 80, 108, 136, 164].map((y) => (
        <Rect key={y} x={16} y={y} width={14} height={10} rx={2} stroke={STROKE} strokeWidth={STROKE_WIDTH} />
      ))}
      {[24, 52, 80, 108, 136, 164].map((y) => (
        <Rect
          key={`r-${y}`}
          x={100}
          y={y}
          width={14}
          height={10}
          rx={2}
          stroke={STROKE}
          strokeWidth={STROKE_WIDTH}
        />
      ))}
      <Line x1={42} y1={48} x2={88} y2={48} stroke={STROKE} strokeWidth={STROKE_WIDTH} />
      <Line x1={42} y1={96} x2={88} y2={96} stroke={STROKE} strokeWidth={STROKE_WIDTH} />
      <Line x1={42} y1={144} x2={88} y2={144} stroke={STROKE} strokeWidth={STROKE_WIDTH} />
    </Svg>
  );
}

function ClapperMark({ width }: { width: number }) {
  const height = Math.round(width * 0.81);
  return (
    <Svg width={width} height={height} viewBox="0 0 118 96" fill="none">
      <Rect x={8} y={34} width={102} height={54} rx={6} stroke={STROKE} strokeWidth={STROKE_WIDTH} />
      <Path
        d="M8 34 L38 12 L108 12 L78 34 Z"
        stroke={STROKE}
        strokeWidth={STROKE_WIDTH}
        strokeLinejoin="round"
      />
      <Line x1={28} y1={18} x2={48} y2={34} stroke={STROKE} strokeWidth={STROKE_WIDTH} />
      <Line x1={48} y1={14} x2={68} y2={30} stroke={STROKE} strokeWidth={STROKE_WIDTH} />
      <Line x1={68} y1={14} x2={88} y2={30} stroke={STROKE} strokeWidth={STROKE_WIDTH} />
      <Line x1={88} y1={14} x2={102} y2={26} stroke={STROKE} strokeWidth={STROKE_WIDTH} />
      <Line x1={24} y1={58} x2={94} y2={58} stroke={STROKE} strokeWidth={STROKE_WIDTH} />
      <Line x1={24} y1={72} x2={94} y2={72} stroke={STROKE} strokeWidth={STROKE_WIDTH} />
    </Svg>
  );
}

function CameraMark({ width }: { width: number }) {
  const height = Math.round(width * 0.87);
  return (
    <Svg width={width} height={height} viewBox="0 0 150 130" fill="none">
      <Rect x={24} y={36} width={88} height={58} rx={8} stroke={STROKE} strokeWidth={STROKE_WIDTH} />
      <Rect x={88} y={48} width={28} height={22} rx={4} stroke={STROKE} strokeWidth={STROKE_WIDTH} />
      <Circle cx={58} cy={65} r={16} stroke={STROKE} strokeWidth={STROKE_WIDTH} />
      <Circle cx={58} cy={65} r={8} stroke={STROKE} strokeWidth={STROKE_WIDTH} />
      <Line x1={48} y1={94} x2={48} y2={118} stroke={STROKE} strokeWidth={STROKE_WIDTH} />
      <Line x1={88} y1={94} x2={88} y2={118} stroke={STROKE} strokeWidth={STROKE_WIDTH} />
      <Line x1={36} y1={118} x2={100} y2={118} stroke={STROKE} strokeWidth={STROKE_WIDTH} />
      <Line x1={48} y1={118} x2={58} y2={94} stroke={STROKE} strokeWidth={STROKE_WIDTH} />
      <Line x1={88} y1={118} x2={78} y2={94} stroke={STROKE} strokeWidth={STROKE_WIDTH} />
    </Svg>
  );
}

export type AuthBackgroundMode = 'signIn' | 'signUp';

interface AuthBackgroundProps {
  mode?: AuthBackgroundMode;
  metrics?: Pick<
    AuthLayoutMetrics,
    'watermarkScale' | 'watermarkOpacityMultiplier' | 'hideCameraWatermark'
  >;
  children?: ReactNode;
}

/** Warm ivory backdrop — faint film watermarks kept away from the logo area. */
export function AuthBackground({ mode = 'signIn', metrics, children }: AuthBackgroundProps) {
  const scale = metrics?.watermarkScale ?? 1;
  const opacityMul = metrics?.watermarkOpacityMultiplier ?? 1;
  const hideCamera = metrics?.hideCameraWatermark ?? false;

  const filmWidth = Math.round(110 * scale);
  const clapperWidth = Math.round(96 * scale);
  const cameraWidth = Math.round(130 * scale);

  const filmOpacity = 0.055 * opacityMul;
  const clapperOpacity = 0.05 * opacityMul;
  const cameraOpacity = 0.048 * opacityMul;

  const cameraSide = mode === 'signIn' ? styles.cameraLeft : styles.cameraRight;

  return (
    <View style={styles.container}>
      <View style={styles.glowTopRight} />
      <View style={styles.glowBottomLeft} />

      <View style={[styles.filmStrip, { opacity: filmOpacity }]}>
        <FilmStripMark width={filmWidth} />
      </View>
      <View style={[styles.clapper, { opacity: clapperOpacity }]}>
        <ClapperMark width={clapperWidth} />
      </View>
      {!hideCamera ? (
        <View style={[cameraSide, { opacity: cameraOpacity }]}>
          <CameraMark width={cameraWidth} />
        </View>
      ) : null}

      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    backgroundColor: authPalette.bg,
    overflow: 'hidden',
  },
  glowTopRight: {
    position: 'absolute',
    top: -120,
    right: -100,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: authPalette.bgGlow,
    opacity: 0.35,
  },
  glowBottomLeft: {
    position: 'absolute',
    bottom: -120,
    left: -90,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: authPalette.bgGlow,
    opacity: 0.25,
  },
  filmStrip: {
    position: 'absolute',
    top: 90,
    left: -44,
    transform: [{ rotate: '-10deg' }],
  },
  clapper: {
    position: 'absolute',
    top: 118,
    right: 28,
    transform: [{ rotate: '8deg' }],
  },
  cameraLeft: {
    position: 'absolute',
    bottom: 80,
    left: -18,
  },
  cameraRight: {
    position: 'absolute',
    bottom: 80,
    right: -18,
  },
});
