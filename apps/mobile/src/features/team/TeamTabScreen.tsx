import { StyleSheet, Text, View } from 'react-native';
import { ScreenContainer } from '@/components/ScreenContainer';
import { AppHeaderActions } from '@/components/AppHeaderActions';
import { EmptyState } from '@/components/ui/EmptyState';
import { ProjectTeamContent } from '@/features/team/ProjectTeamContent';
import { useActiveProject } from '@/context/ActiveProjectContext';
import { colors, spacing, typography } from '@/theme';
import { fontFamily } from '@/theme/fonts';

/** Team tab — the active film's crew roster. */
export default function TeamTabScreen() {
  const { projectId } = useActiveProject();

  return (
    <ScreenContainer scroll topAligned edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.wordmark}>
            CIRCU<Text style={styles.wordmarkAccent}>IT</Text>
          </Text>
          <Text style={styles.title}>Team</Text>
        </View>
        <AppHeaderActions />
      </View>

      {projectId ? (
        <ProjectTeamContent projectId={projectId} />
      ) : (
        <EmptyState title="No project yet" body="Create or join a film to see your crew." />
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
  wordmark: { fontFamily: fontFamily.extrabold, fontSize: 18, color: colors.textPrimary },
  wordmarkAccent: { color: colors.brand },
  title: { ...typography.title, color: colors.textPrimary, marginTop: spacing.sm },
});
