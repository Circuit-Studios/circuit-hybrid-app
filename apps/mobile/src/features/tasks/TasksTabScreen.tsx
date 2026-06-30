import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { ScreenContainer } from '@/components/ScreenContainer';
import { AppHeaderActions } from '@/components/AppHeaderActions';
import { EmptyState } from '@/components/ui/EmptyState';
import { ProjectTasksContent } from '@/features/tasks/ProjectTasksContent';
import { useActiveProject } from '@/context/ActiveProjectContext';
import { useProjectRoom } from '@/realtime/useProjectRoom';
import { colors, spacing, typography } from '@/theme';

/** Tasks tab — the active film's department board. */
export default function TasksTabScreen() {
  const { projectId } = useActiveProject();
  const { dept } = useLocalSearchParams<{ dept?: string }>();
  useProjectRoom(projectId ?? '');

  return (
    <ScreenContainer scroll topAligned edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.wordmark}>
            CIRCU<Text style={styles.wordmarkAccent}>IT</Text>
          </Text>
          <Text style={styles.title}>Tasks</Text>
        </View>
        <AppHeaderActions />
      </View>

      {projectId ? (
        <ProjectTasksContent projectId={projectId} initialDept={dept ?? null} />
      ) : (
        <EmptyState
          title="No project yet"
          body="Create or join a film to start tracking pre-production tasks."
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },
  wordmark: { fontSize: 18, fontWeight: '800', color: colors.textPrimary },
  wordmarkAccent: { color: colors.brand },
  title: { ...typography.title, color: colors.textPrimary, marginTop: spacing.sm },
});
