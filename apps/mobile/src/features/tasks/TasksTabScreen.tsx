import { StyleSheet, Text, View } from 'react-native';
import { ScreenContainer } from '@/components/ScreenContainer';
import { AppHeaderActions } from '@/components/AppHeaderActions';
import { MyTasksContent } from '@/features/tasks/MyTasksContent';
import { colors, spacing, typography } from '@/theme';

/**
 * Global Tasks tab — every task assigned to you across all productions.
 * The project-scoped department board lives inside each project's workspace.
 */
export default function TasksTabScreen() {
  return (
    <ScreenContainer scroll topAligned edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.wordmark}>
            CIRCU<Text style={styles.wordmarkAccent}>IT</Text>
          </Text>
          <Text style={styles.title}>My tasks</Text>
        </View>
        <AppHeaderActions />
      </View>

      <MyTasksContent />
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
