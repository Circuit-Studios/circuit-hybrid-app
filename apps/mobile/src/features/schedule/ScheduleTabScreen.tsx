import { StyleSheet, Text, View } from 'react-native';
import { ScreenContainer } from '@/components/ScreenContainer';
import { AppHeaderActions } from '@/components/AppHeaderActions';
import { EmptyState } from '@/components/ui/EmptyState';
import { ProjectScheduleContent } from '@/features/schedule/ProjectScheduleContent';
import { useActiveProject } from '@/context/ActiveProjectContext';
import { colors, spacing, typography } from '@/theme';

/** Schedule tab — the active film's shoot calendar. */
export default function ScheduleTabScreen() {
  const { projectId } = useActiveProject();

  return (
    <ScreenContainer scroll topAligned edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.wordmark}>
            CIRCU<Text style={styles.wordmarkAccent}>IT</Text>
          </Text>
          <Text style={styles.title}>Shoot schedule</Text>
        </View>
        <AppHeaderActions />
      </View>

      {projectId ? (
        <ProjectScheduleContent projectId={projectId} />
      ) : (
        <EmptyState
          title="No project yet"
          body="Create or join a film to see its shoot schedule."
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
