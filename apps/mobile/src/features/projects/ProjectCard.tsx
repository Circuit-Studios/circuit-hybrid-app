import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/components/Card';
import { StatusBadge } from '@/components/StatusBadge';
import { colors, radius, spacing, typography } from '@/theme';
import { formatProjectLanguages, formatRole, formatStatus, relativeTimeFrom } from '@/lib/format';
import type { Project } from '@/api/types';

interface ProjectCardProps {
  project: Project;
  nextShootDay?: { dayNumber: number; date: string } | null;
  onPress: () => void;
}

export function ProjectCard({ project, nextShootDay, onPress }: ProjectCardProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [pressed && styles.rowPressed]}
    >
      <Card variant="glass">
        <View style={styles.rowTop}>
          <View style={styles.poster}>
            <Text style={styles.posterLetter}>{project.name.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={styles.main}>
            <Text style={styles.projectName} numberOfLines={2}>
              {project.name}
            </Text>
            <View style={styles.chipRow}>
              {project.role ? <StatusBadge label={formatRole(project.role)} tone="accent" /> : null}
              <StatusBadge label={formatStatus(project.currentStage)} tone="info" />
            </View>
            <Text style={styles.projectMeta}>
              {project.genre} · {formatProjectLanguages(project)}
            </Text>
            {project.updatedAt ? (
              <Text style={styles.projectFoot}>Updated {relativeTimeFrom(project.updatedAt)}</Text>
            ) : null}
            {nextShootDay ? (
              <Text style={styles.projectFoot}>
                Next shoot · Day {nextShootDay.dayNumber} ·{' '}
                {new Date(nextShootDay.date).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                })}
              </Text>
            ) : null}
          </View>
          <Ionicons name="chevron-forward" size={22} color={colors.textMuted} />
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  rowPressed: { opacity: 0.9, transform: [{ scale: 0.995 }] },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  poster: {
    width: 56,
    height: 72,
    borderRadius: radius.md,
    backgroundColor: colors.brandSoft,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  posterLetter: {
    ...typography.title,
    color: colors.brand,
    fontSize: 26,
  },
  main: { flex: 1, gap: spacing.xs },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  projectName: {
    ...typography.title,
    fontSize: 20,
    color: colors.textPrimary,
  },
  projectMeta: { ...typography.caption, color: colors.textSecondary },
  projectFoot: { ...typography.micro, color: colors.textMuted },
});
