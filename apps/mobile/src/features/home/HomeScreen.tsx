import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from '@/components/ScreenContainer';
import { AppHeaderActions } from '@/components/AppHeaderActions';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingState } from '@/components/ui/LoadingState';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/Card';
import { ProjectOverviewContent } from '@/features/projects/ProjectOverviewContent';
import { useProjectsQuery } from '@/features/projects/hooks';
import { useActiveProject } from '@/context/ActiveProjectContext';
import { useAuth } from '@/auth/AuthContext';
import { formatStatus } from '@/lib/format';
import { colors, radius, spacing, typography } from '@/theme';

function greetingForHour(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { projectId, setProjectId } = useActiveProject();
  const { data: projects = [], isLoading } = useProjectsQuery();

  const canStartProject = user?.defaultRole === 'DIRECTOR' || user?.defaultRole === 'PRODUCER';
  const otherProjects = projects.filter((p) => p.id !== projectId);

  if (isLoading && !projects.length) {
    return (
      <ScreenContainer scroll edges={['top', 'left', 'right']}>
        <View style={styles.headerRow}>
          <CircuitWordmark />
          <AppHeaderActions />
        </View>
        <LoadingState />
      </ScreenContainer>
    );
  }

  if (!projectId) {
    return (
      <ScreenContainer scroll edges={['top', 'left', 'right']}>
        <View style={styles.headerRow}>
          <CircuitWordmark />
          <AppHeaderActions />
        </View>
        <EmptyState
          title={canStartProject ? 'Start your first film' : 'Waiting on an invite'}
          body={
            canStartProject
              ? 'Create a project to open your film command centre.'
              : 'Ask your director or producer to invite you by email.'
          }
          action={
            canStartProject ? (
              <Button title="New film" onPress={() => router.push('/(app)/create-project')} />
            ) : null
          }
        />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer scroll edges={['top', 'left', 'right']}>
      <View style={styles.headerRow}>
        <CircuitWordmark />
        <AppHeaderActions />
      </View>

      <Text style={styles.greeting}>
        {greetingForHour()}
        {user?.firstName ? `, ${user.firstName}` : ''}
      </Text>
      <Text style={styles.title}>Film command centre</Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.actionsScroll}>
        <QuickAction
          icon="document-text-outline"
          label="New film"
          onPress={() => router.push('/(app)/create-project')}
        />
        <QuickAction
          icon="person-add-outline"
          label="Invite team"
          onPress={() => router.push('/(app)/(tabs)/team')}
        />
        <QuickAction
          icon="calendar-outline"
          label="Add shoot day"
          onPress={() => router.push('/(app)/(tabs)/schedule')}
        />
        <QuickAction
          icon="add"
          label="Add task"
          accent
          onPress={() => router.push('/(app)/(tabs)/tasks')}
        />
      </ScrollView>

      <ProjectOverviewContent projectId={projectId} />

      {otherProjects.length > 0 ? (
        <>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>Switch production</Text>
            <Pressable onPress={() => router.push('/(app)/projects')}>
              <Text style={styles.viewAll}>View all</Text>
            </Pressable>
          </View>

          {otherProjects.map((p) => (
            <Card key={p.id} style={styles.productionCard}>
              <Pressable onPress={() => setProjectId(p.id)} style={styles.productionInner}>
                <View style={styles.filmIcon}>
                  <Ionicons name="film-outline" size={18} color={colors.textPrimary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.productionName}>{p.name}</Text>
                  <Text style={styles.productionSub}>{formatStatus(p.currentStage)}</Text>
                </View>
                <Ionicons name="swap-horizontal" size={18} color={colors.textMuted} />
              </Pressable>
            </Card>
          ))}
        </>
      ) : null}
    </ScreenContainer>
  );
}

function CircuitWordmark() {
  return (
    <Text style={styles.wordmark}>
      CIRCU<Text style={styles.wordmarkAccent}>IT</Text>
    </Text>
  );
}

function QuickAction({
  icon,
  label,
  accent,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  accent?: boolean;
  onPress(): void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.quickAction}>
      <View style={[styles.quickIcon, accent && styles.quickIconAccent]}>
        <Ionicons name={icon} size={20} color={accent ? colors.onBrand : colors.textPrimary} />
      </View>
      <Text style={styles.quickLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  wordmark: { fontSize: 22, fontWeight: '800', color: colors.textPrimary },
  wordmarkAccent: { color: colors.brand },
  greeting: { ...typography.body, color: colors.textSecondary },
  title: { ...typography.title, color: colors.textPrimary, marginBottom: spacing.lg },
  actionsScroll: { marginBottom: spacing.xl },
  quickAction: { alignItems: 'center', marginRight: spacing.lg, width: 72 },
  quickIcon: {
    width: 52,
    height: 52,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  quickIconAccent: { backgroundColor: colors.brand, borderColor: colors.brand },
  quickLabel: { ...typography.caption, color: colors.textSecondary, textAlign: 'center' },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  sectionTitle: { ...typography.heading, color: colors.textPrimary },
  viewAll: { ...typography.bodyStrong, color: colors.brand },
  productionCard: { marginBottom: spacing.md },
  productionInner: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  filmIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productionName: { ...typography.heading, color: colors.textPrimary },
  productionSub: { ...typography.caption, color: colors.textSecondary },
});
