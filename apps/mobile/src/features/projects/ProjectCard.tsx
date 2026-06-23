import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/components/Card';
import { StatusBadge } from '@/components/StatusBadge';
import { colors, radius, spacing, typography } from '@/theme';
import { formatProjectLanguages, formatRole, formatStatus } from '@/lib/format';
import type { Project } from '@/api/types';

interface ProjectCardProps {
  project: Project;
}

export function ProjectCard({ project }: ProjectCardProps) {
  const router = useRouter();
  return (
    <Pressable
      onPress={() => router.push(`/(app)/project/${project.id}`)}
      accessibilityRole="button"
      style={({ pressed }) => [pressed && styles.rowPressed]}
    >
      <Card variant="glass">
        <View style={styles.rowTop}>
          <View style={styles.poster}>
            <Text style={styles.posterLetter}>{project.name.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.projectName}>{project.name}</Text>
            <Text style={styles.projectMeta}>
              {formatProjectLanguages(project)} · {project.genre}
            </Text>
            <View style={styles.rowBottom}>
              <StatusBadge label={formatStatus(project.currentStage)} tone="info" />
              {project.role ? <StatusBadge label={formatRole(project.role)} tone="accent" /> : null}
            </View>
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
  rowBottom: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  projectName: {
    ...typography.title,
    fontSize: 20,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  projectMeta: { ...typography.caption, color: colors.textSecondary },
});
