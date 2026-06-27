import type { ConflictSeverity, TaskPriority, TaskStatus } from '@/api/types';
import { colors } from './tokens';

export type Tone = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'accent';

/** Priority → color (for the card rail/dot) + badge tone + label. */
export const priorityMeta: Record<TaskPriority, { label: string; color: string; tone: Tone }> = {
  LOW: { label: 'Low', color: colors.textMuted, tone: 'neutral' },
  MEDIUM: { label: 'Medium', color: colors.info, tone: 'info' },
  HIGH: { label: 'High', color: colors.warning, tone: 'warning' },
  URGENT: { label: 'Urgent', color: colors.danger, tone: 'danger' },
};

/** Task status → label + badge tone, shared across Tasks + anywhere status shows. */
export const taskStatusMeta: Record<TaskStatus, { label: string; tone: Tone }> = {
  TODO: { label: 'To do', tone: 'neutral' },
  IN_PROGRESS: { label: 'In progress', tone: 'info' },
  BLOCKED: { label: 'Blocked', tone: 'warning' },
  DONE: { label: 'Done', tone: 'success' },
};

/** Conflict severity → tone + rail color. */
export const conflictSeverityMeta: Record<ConflictSeverity, { tone: Tone; color: string }> = {
  INFO: { tone: 'info', color: colors.info },
  WARNING: { tone: 'warning', color: colors.warning },
  CRITICAL: { tone: 'danger', color: colors.danger },
};

/**
 * Classic film stripboard colors (INT/EXT × DAY/NIGHT), tuned for the light
 * theme. Used as a left accent rail on schedule day/scene rows when scene
 * metadata is available.
 */
export const sceneStrip = {
  INT_DAY: '#9CA3AF', // white strip → neutral grey on light bg
  EXT_DAY: colors.brand, // yellow
  INT_NIGHT: '#3B82F6', // blue
  EXT_NIGHT: '#1E8E5A', // green
  UNKNOWN: colors.border,
} as const;

export function sceneStripColor(
  interiorExterior:
    | 'INT'
    | 'EXT'
    | 'INT_EXT'
    | 'INTERIOR'
    | 'EXTERIOR'
    | 'UNKNOWN'
    | null
    | undefined,
  timeOfDay:
    | 'DAY'
    | 'NIGHT'
    | 'DAWN'
    | 'DUSK'
    | 'CONTINUOUS'
    | 'UNSPECIFIED'
    | 'UNKNOWN'
    | null
    | undefined,
): string {
  const isExt = interiorExterior === 'EXT' || interiorExterior === 'EXTERIOR';
  const isNight = timeOfDay === 'NIGHT' || timeOfDay === 'DUSK';
  if (interiorExterior == null || timeOfDay == null) return sceneStrip.UNKNOWN;
  if (isExt && isNight) return sceneStrip.EXT_NIGHT;
  if (isExt) return sceneStrip.EXT_DAY;
  if (isNight) return sceneStrip.INT_NIGHT;
  return sceneStrip.INT_DAY;
}
