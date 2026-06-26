import { useMemo, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from 'react-native';
import { ScreenContainer } from '@/components/ScreenContainer';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Card } from '@/components/Card';
import { StatusBadge } from '@/components/StatusBadge';
import { SectionHeader } from '@/components/SectionHeader';
import { EmptyState } from '@/components/EmptyState';
import {
  BudgetLineEditSheet,
  CharacterEditSheet,
  DepartmentEditSheet,
  SceneEditSheet,
} from '@/components/EditSheets';
import { getAnalysis } from '@/api/scripts';
import { listBudgetLines, listCharacters, listDepartments, listScenes } from '@/api/edits';
import { readApiError } from '@/api/client';
import { qk } from '@/api/queryKeys';
import { useAuth } from '@/auth/AuthContext';
import { useContentFrame } from '@/hooks/useContentFrame';
import { getDeptCardStyle, colors, radius, spacing, typography } from '@/theme';
import { formatCurrencyINR, formatNumber } from '@/lib/format';
import type {
  AICharacter,
  AIDepartment,
  AIScene,
  AIBudgetLine,
  AICombinationGroup,
  BudgetLineRecord,
  CharacterRecord,
  DepartmentRecord,
  SceneRecord,
  UserRole,
} from '@/api/types';

const EDITOR_ROLES: UserRole[] = [
  'DIRECTOR',
  'PRODUCER',
  'EXECUTIVE_PRODUCER',
  'LINE_PRODUCER',
  'AD',
];

export default function AIResultsScreen() {
  const { id: projectId, scriptId } = useLocalSearchParams<{ id: string; scriptId?: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { contentWidth } = useContentFrame('auto');
  const deptCardStyle = useMemo(() => getDeptCardStyle(contentWidth), [contentWidth]);
  const canEdit = !!user && EDITOR_ROLES.includes(user.defaultRole);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: qk.analysis(scriptId!),
    queryFn: () => getAnalysis(scriptId!),
    enabled: !!scriptId,
  });

  // Canonical editable rows — fetched in parallel with the summary. We index
  // by the key the summary uses (name, sceneNumber, kind, label) so the row
  // press handlers can resolve the record without an extra round-trip.
  const charactersQ = useQuery({
    queryKey: qk.characters(projectId!),
    queryFn: () => listCharacters(projectId!),
    enabled: !!projectId && canEdit,
  });
  const scenesQ = useQuery({
    queryKey: qk.scenes(projectId!),
    queryFn: () => listScenes(projectId!),
    enabled: !!projectId && canEdit,
  });
  const departmentsQ = useQuery({
    queryKey: qk.departments(projectId!),
    queryFn: () => listDepartments(projectId!),
    enabled: !!projectId && canEdit,
  });
  const budgetLinesQ = useQuery({
    queryKey: qk.budgetLines(projectId!),
    queryFn: () => listBudgetLines(projectId!),
    enabled: !!projectId && canEdit,
  });

  const characterByName = useMemo(() => {
    const map = new Map<string, CharacterRecord>();
    for (const c of charactersQ.data ?? []) map.set(c.name, c);
    return map;
  }, [charactersQ.data]);
  const sceneByNumber = useMemo(() => {
    const map = new Map<string, SceneRecord>();
    for (const s of scenesQ.data ?? []) map.set(s.sceneNumber, s);
    return map;
  }, [scenesQ.data]);
  const departmentByKind = useMemo(() => {
    const map = new Map<string, DepartmentRecord>();
    for (const d of departmentsQ.data ?? []) map.set(d.kind, d);
    return map;
  }, [departmentsQ.data]);
  const budgetByLabel = useMemo(() => {
    const map = new Map<string, BudgetLineRecord>();
    for (const b of budgetLinesQ.data ?? []) map.set(`${b.department}::${b.label}`, b);
    return map;
  }, [budgetLinesQ.data]);

  const [editingCharacter, setEditingCharacter] = useState<CharacterRecord | null>(null);
  const [editingScene, setEditingScene] = useState<SceneRecord | null>(null);
  const [editingDepartment, setEditingDepartment] = useState<DepartmentRecord | null>(null);
  const [editingBudgetLine, setEditingBudgetLine] = useState<BudgetLineRecord | null>(null);

  if (isLoading) {
    return (
      <ScreenContainer>
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} />
        </View>
      </ScreenContainer>
    );
  }

  if (error || !data) {
    return (
      <ScreenContainer>
        <EmptyState
          title="Couldn't load results"
          body={error ? readApiError(error) : 'No data yet.'}
          action={<PrimaryButton title="Retry" onPress={() => refetch()} />}
        />
      </ScreenContainer>
    );
  }

  const { script, summary } = data;

  if (!summary || script.analysisStatus !== 'COMPLETED') {
    return (
      <ScreenContainer>
        <EmptyState
          title={script.analysisStatus === 'FAILED' ? 'Analysis failed' : 'Analysis not ready'}
          body={
            script.analysisError ??
            'Head back to the progress screen — we may still be working on it.'
          }
          action={
            <PrimaryButton
              title="Back to progress"
              onPress={() =>
                router.replace(`/(app)/project/${projectId}/ai-progress?scriptId=${scriptId}`)
              }
            />
          }
        />
      </ScreenContainer>
    );
  }

  const totalScenes = summary.scenes.scenes.length;
  const totalChars = summary.characters.characters.length;
  const leadCount = summary.characters.characters.filter((c) => c.importance === 'LEAD').length;
  const totalShootDays = summary.shootDays.totalShootDaysEstimate;
  const savings = summary.combinations.totalEstimatedSavingsDays;
  const budgetTotal = summary.budget.totalINR;

  return (
    <ScreenContainer scroll>
      <Pressable onPress={() => router.replace(`/(app)/project/${projectId}`)} hitSlop={12}>
        <Text style={styles.back}>‹ Project</Text>
      </Pressable>

      <Text style={styles.eyebrow}>AI Analysis</Text>
      <Text style={styles.title}>Here's your script,{'\n'}deconstructed.</Text>
      <Text style={styles.body}>
        Source: <Text style={styles.bodyStrong}>{script.originalFileName}</Text>
      </Text>

      {/* Headline metrics — the "wow moment" the demo lands on. */}
      <View style={styles.statsRow}>
        <StatTile big={String(totalScenes)} label="Scenes" />
        <StatTile big={String(totalChars)} label="Characters" sub={`${leadCount} lead`} />
        <StatTile big={String(Math.round(totalShootDays))} label="Shoot days" />
      </View>

      <View style={styles.reviewCta}>
        <PrimaryButton
          title="Review shooting plan & tasks"
          onPress={() =>
            router.push(`/(app)/project/${projectId}/director-review?scriptId=${scriptId ?? ''}`)
          }
        />
      </View>

      {savings > 0 ? (
        <Card style={styles.savingsCard}>
          <Text style={styles.savingsEyebrow}>Combination scenes</Text>
          <Text style={styles.savingsTitle}>
            ~{formatNumber(savings)} days saved if you batch scenes together
          </Text>
          <Text style={styles.savingsBody}>
            We found {summary.combinations.groups.length} groups of scenes that share actors and
            locations. Shooting them on consecutive days collapses your schedule.
          </Text>
        </Card>
      ) : null}

      <SectionHeader
        title="Characters"
        sub={`${totalChars} extracted from your script`}
        trailing={canEdit ? <Text style={styles.editHint}>Tap to edit</Text> : null}
      />
      <Card>
        {summary.characters.characters.slice(0, 8).map((c) => {
          const record = characterByName.get(c.name);
          return (
            <CharacterRow
              key={c.name}
              character={c}
              edited={!!record?.isEdited}
              onPress={canEdit && record ? () => setEditingCharacter(record) : undefined}
            />
          );
        })}
        {summary.characters.characters.length > 8 ? (
          <Text style={styles.moreLink}>+{summary.characters.characters.length - 8} more</Text>
        ) : null}
      </Card>

      <SectionHeader
        title="Scenes"
        sub="First 10 — full list available in the workspace"
        trailing={canEdit ? <Text style={styles.editHint}>Tap to edit</Text> : null}
      />
      <Card>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View>
            <SceneHeader />
            {summary.scenes.scenes.slice(0, 10).map((scene) => {
              const record = sceneByNumber.get(scene.sceneNumber);
              return (
                <SceneRow
                  key={scene.sceneNumber + scene.heading}
                  scene={scene}
                  edited={!!record?.isEdited}
                  onPress={canEdit && record ? () => setEditingScene(record) : undefined}
                />
              );
            })}
          </View>
        </ScrollView>
      </Card>

      {summary.combinations.groups.length > 0 ? (
        <>
          <SectionHeader title="Combination scenes" sub="Bundle these to shave shoot days" />
          {summary.combinations.groups.slice(0, 5).map((group) => (
            <CombinationCard key={group.groupLabel} group={group} />
          ))}
        </>
      ) : null}

      <SectionHeader
        title="Departments"
        sub="Only what your story needs"
        trailing={canEdit ? <Text style={styles.editHint}>Tap to edit</Text> : null}
      />
      <View style={styles.deptGrid}>
        {summary.departments.departments.map((dept) => {
          const record = departmentByKind.get(dept.kind);
          return (
            <DepartmentCard
              key={dept.kind}
              dept={dept}
              edited={!!record?.isEdited}
              wrapStyle={deptCardStyle}
              onPress={canEdit && record ? () => setEditingDepartment(record) : undefined}
            />
          );
        })}
      </View>

      <SectionHeader title="Shoot days per actor" />
      <Card>
        {summary.shootDays.perActor.slice(0, 8).map((item) => (
          <View key={item.character} style={styles.actorRow}>
            <Text style={styles.actorName}>{item.character}</Text>
            <View style={styles.actorMeta}>
              <Text style={styles.actorScenes}>{item.sceneCount} scenes</Text>
              <Text style={styles.actorDays}>{formatNumber(item.estimatedDays)} days</Text>
            </View>
          </View>
        ))}
        {summary.shootDays.optimizationHints.length > 0 ? (
          <View style={styles.hintsBox}>
            {summary.shootDays.optimizationHints.slice(0, 4).map((hint) => (
              <Text key={hint} style={styles.hint}>
                · {hint}
              </Text>
            ))}
          </View>
        ) : null}
      </Card>

      <SectionHeader
        title="Budget draft"
        sub={`Confidence: ${summary.budget.confidence.toLowerCase()}`}
        trailing={canEdit ? <Text style={styles.editHint}>Tap to edit</Text> : null}
      />
      <Card>
        <Text style={styles.budgetTotal}>{formatCurrencyINR(budgetTotal)}</Text>
        <Text style={styles.budgetCaption}>Total across all departments</Text>
        <View style={styles.budgetList}>
          {summary.budget.lines.slice(0, 10).map((line) => {
            const record = budgetByLabel.get(`${line.department}::${line.label}`);
            return (
              <BudgetRow
                key={`${line.department}-${line.label}`}
                line={line}
                edited={!!record?.isEdited}
                onPress={canEdit && record ? () => setEditingBudgetLine(record) : undefined}
              />
            );
          })}
        </View>
        {summary.budget.caveats.length > 0 ? (
          <View style={styles.caveatsBox}>
            <Text style={styles.caveatsTitle}>Caveats</Text>
            {summary.budget.caveats.map((c) => (
              <Text key={c} style={styles.caveat}>
                · {c}
              </Text>
            ))}
          </View>
        ) : null}
      </Card>

      <View style={styles.actions}>
        <PrimaryButton
          title="Open project workspace"
          onPress={() => router.replace(`/(app)/project/${projectId}`)}
        />
      </View>

      <CharacterEditSheet character={editingCharacter} onClose={() => setEditingCharacter(null)} />
      <SceneEditSheet scene={editingScene} onClose={() => setEditingScene(null)} />
      <DepartmentEditSheet
        department={editingDepartment}
        onClose={() => setEditingDepartment(null)}
      />
      <BudgetLineEditSheet line={editingBudgetLine} onClose={() => setEditingBudgetLine(null)} />
    </ScreenContainer>
  );
}

function StatTile({ big, label, sub }: { big: string; label: string; sub?: string }) {
  return (
    <View style={styles.statTile}>
      <Text style={styles.statBig}>{big}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      {sub ? <Text style={styles.statSub}>{sub}</Text> : null}
    </View>
  );
}

function CharacterRow({
  character,
  edited,
  onPress,
}: {
  character: AICharacter;
  edited?: boolean;
  onPress?: () => void;
}) {
  const tone =
    character.importance === 'LEAD'
      ? 'accent'
      : character.importance === 'SUPPORT'
        ? 'info'
        : 'neutral';
  const content = (
    <View style={styles.charRow}>
      <View style={{ flex: 1 }}>
        <View style={styles.inlineHeader}>
          <Text style={styles.charName}>{character.name}</Text>
          {edited ? <StatusBadge label="EDITED" tone="warning" /> : null}
        </View>
        {character.notes ? (
          <Text style={styles.charNotes} numberOfLines={2}>
            {character.notes}
          </Text>
        ) : null}
      </View>
      <View style={styles.charRight}>
        <StatusBadge label={character.importance.replace('_', ' ')} tone={tone} />
        {character.estimatedScreenTimeMinutes != null ? (
          <Text style={styles.charScreenTime}>~{character.estimatedScreenTimeMinutes}m</Text>
        ) : null}
      </View>
    </View>
  );
  return onPress ? (
    <Pressable onPress={onPress} accessibilityRole="button">
      {content}
    </Pressable>
  ) : (
    content
  );
}

function SceneHeader() {
  return (
    <View style={styles.sceneRow}>
      <Text style={[styles.sceneCellHead, { width: 50 }]}>#</Text>
      <Text style={[styles.sceneCellHead, { width: 60 }]}>INT/EXT</Text>
      <Text style={[styles.sceneCellHead, { width: 70 }]}>Time</Text>
      <Text style={[styles.sceneCellHead, { width: 220 }]}>Heading</Text>
      <Text style={[styles.sceneCellHead, { width: 80 }]}>Pages</Text>
      <Text style={[styles.sceneCellHead, { width: 120 }]}>Flags</Text>
    </View>
  );
}

function SceneRow({
  scene,
  edited,
  onPress,
}: {
  scene: AIScene;
  edited?: boolean;
  onPress?: () => void;
}) {
  const content = (
    <View style={[styles.sceneRow, styles.sceneRowBody]}>
      <Text style={[styles.sceneCell, { width: 50 }]}>{scene.sceneNumber}</Text>
      <Text style={[styles.sceneCell, { width: 60 }]}>
        {scene.locationType === 'INT_EXT' ? 'INT/EXT' : scene.locationType.slice(0, 3)}
      </Text>
      <Text style={[styles.sceneCell, { width: 70 }]}>{scene.timeOfDay}</Text>
      <Text style={[styles.sceneCell, { width: 220 }]} numberOfLines={1}>
        {scene.heading}
      </Text>
      <Text style={[styles.sceneCell, { width: 80 }]}>
        {scene.estimatedPages != null ? scene.estimatedPages.toFixed(1) : '—'}
      </Text>
      <View style={[styles.sceneCellFlags, { width: 140 }]}>
        {scene.hasStunts ? <StatusBadge label="STUNT" tone="danger" /> : null}
        {scene.hasVFX ? <StatusBadge label="VFX" tone="info" /> : null}
        {scene.hasSong ? <StatusBadge label="SONG" tone="accent" /> : null}
        {edited ? <StatusBadge label="EDITED" tone="warning" /> : null}
      </View>
    </View>
  );
  return onPress ? (
    <Pressable onPress={onPress} accessibilityRole="button">
      {content}
    </Pressable>
  ) : (
    content
  );
}

function CombinationCard({ group }: { group: AICombinationGroup }) {
  const saved = group.estimatedDaysIfShotSeparately - group.estimatedDaysIfShotTogether;
  return (
    <Card style={styles.comboCard}>
      <Text style={styles.comboLabel}>{group.groupLabel}</Text>
      <Text style={styles.comboMeta}>{group.characters.join(' · ')}</Text>
      <View style={styles.comboRow}>
        <View>
          <Text style={styles.comboStatBig}>
            {formatNumber(group.estimatedDaysIfShotTogether)} days
          </Text>
          <Text style={styles.comboStatLabel}>If shot together</Text>
        </View>
        <View>
          <Text style={[styles.comboStatBig, { color: colors.textMuted }]}>
            {formatNumber(group.estimatedDaysIfShotSeparately)} days
          </Text>
          <Text style={styles.comboStatLabel}>If shot apart</Text>
        </View>
        <View>
          <Text style={[styles.comboStatBig, { color: colors.success }]}>
            −{formatNumber(saved)}d
          </Text>
          <Text style={styles.comboStatLabel}>Saved</Text>
        </View>
      </View>
      <Text style={styles.comboScenes}>Scenes: {group.sceneNumbers.join(', ')}</Text>
    </Card>
  );
}

function DepartmentCard({
  dept,
  edited,
  wrapStyle,
  onPress,
}: {
  dept: AIDepartment;
  edited?: boolean;
  wrapStyle: ViewStyle;
  onPress?: () => void;
}) {
  const inner = (
    <View style={styles.deptCard}>
      <View style={styles.inlineHeader}>
        <Text style={styles.deptName}>{dept.displayName}</Text>
        {edited ? <StatusBadge label="EDITED" tone="warning" /> : null}
      </View>
      {dept.required ? (
        <StatusBadge label="Required" tone="success" />
      ) : (
        <StatusBadge label="Optional" tone="neutral" />
      )}
      <Text style={styles.deptReason} numberOfLines={3}>
        {dept.reasoning}
      </Text>
    </View>
  );
  // Outer wrapper always carries the 48% grid sizing so we don't break the
  // two-column layout whether or not the card is tappable.
  return onPress ? (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={[styles.deptCardWrap, wrapStyle]}
    >
      {inner}
    </Pressable>
  ) : (
    <View style={[styles.deptCardWrap, wrapStyle]}>{inner}</View>
  );
}

function BudgetRow({
  line,
  edited,
  onPress,
}: {
  line: AIBudgetLine;
  edited?: boolean;
  onPress?: () => void;
}) {
  const content = (
    <View style={styles.budgetRow}>
      <View style={{ flex: 1 }}>
        <View style={styles.inlineHeader}>
          <Text style={styles.budgetLabel}>{line.label}</Text>
          {edited ? <StatusBadge label="EDITED" tone="warning" /> : null}
        </View>
        <Text style={styles.budgetDept}>{line.department.replace(/_/g, ' ')}</Text>
      </View>
      <Text style={styles.budgetAmount}>{formatCurrencyINR(line.amountINR)}</Text>
    </View>
  );
  return onPress ? (
    <Pressable onPress={onPress} accessibilityRole="button">
      {content}
    </Pressable>
  ) : (
    content
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  back: { ...typography.bodyStrong, color: colors.textSecondary, marginBottom: spacing.md },
  eyebrow: {
    ...typography.micro,
    color: colors.accent,
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
  },
  title: { ...typography.display, color: colors.textPrimary, marginBottom: spacing.sm },
  body: { ...typography.body, color: colors.textSecondary, marginBottom: spacing.lg },
  bodyStrong: { color: colors.textPrimary, fontWeight: '600' },
  statsRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  reviewCta: { marginTop: spacing.md, marginBottom: spacing.md },
  statTile: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    alignItems: 'center',
  },
  statBig: { ...typography.display, color: colors.accent },
  statLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  statSub: { ...typography.caption, color: colors.textMuted },
  savingsCard: {
    marginTop: spacing.xl,
    borderColor: colors.accentMuted,
    backgroundColor: 'rgba(242, 193, 78, 0.10)',
  },
  savingsEyebrow: { ...typography.micro, color: colors.accent, textTransform: 'uppercase' },
  savingsTitle: { ...typography.heading, color: colors.textPrimary, marginTop: spacing.xs },
  savingsBody: { ...typography.body, color: colors.textSecondary, marginTop: spacing.xs },
  moreLink: { ...typography.bodyStrong, color: colors.accent, paddingTop: spacing.sm },
  editHint: { ...typography.caption, color: colors.accent },
  inlineHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  charRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  charName: { ...typography.bodyStrong, color: colors.textPrimary },
  charNotes: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  charRight: { alignItems: 'flex-end', gap: spacing.xs },
  charScreenTime: { ...typography.caption, color: colors.textMuted },
  sceneRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm },
  sceneRowBody: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  sceneCell: { ...typography.body, color: colors.textPrimary, paddingHorizontal: spacing.xs },
  sceneCellHead: {
    ...typography.micro,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    paddingHorizontal: spacing.xs,
  },
  sceneCellFlags: { flexDirection: 'row', gap: 4, flexWrap: 'wrap' },
  comboCard: { marginTop: spacing.md, gap: spacing.xs },
  comboLabel: { ...typography.heading, color: colors.textPrimary },
  comboMeta: { ...typography.caption, color: colors.textSecondary },
  comboRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.sm },
  comboStatBig: { ...typography.heading, color: colors.textPrimary },
  comboStatLabel: { ...typography.caption, color: colors.textMuted, textTransform: 'uppercase' },
  comboScenes: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.sm },
  deptGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  deptCardWrap: { flexGrow: 0 },
  deptCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.xs,
  },
  deptName: { ...typography.heading, color: colors.textPrimary },
  deptReason: { ...typography.caption, color: colors.textSecondary },
  actorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  actorName: { ...typography.bodyStrong, color: colors.textPrimary, flex: 1 },
  actorMeta: { flexDirection: 'row', gap: spacing.lg, alignItems: 'center' },
  actorScenes: { ...typography.caption, color: colors.textMuted },
  actorDays: { ...typography.bodyStrong, color: colors.accent },
  hintsBox: { marginTop: spacing.md, gap: 4 },
  hint: { ...typography.caption, color: colors.textSecondary },
  budgetTotal: { ...typography.display, color: colors.accent },
  budgetCaption: { ...typography.caption, color: colors.textMuted, marginBottom: spacing.md },
  budgetList: { gap: spacing.xs },
  budgetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  budgetLabel: { ...typography.bodyStrong, color: colors.textPrimary },
  budgetDept: { ...typography.caption, color: colors.textMuted, textTransform: 'uppercase' },
  budgetAmount: { ...typography.bodyStrong, color: colors.textPrimary, marginLeft: spacing.md },
  caveatsBox: { marginTop: spacing.md, gap: 4 },
  caveatsTitle: { ...typography.bodyStrong, color: colors.textSecondary, marginBottom: spacing.xs },
  caveat: { ...typography.caption, color: colors.textMuted },
  actions: { marginTop: spacing.xxl },
});
