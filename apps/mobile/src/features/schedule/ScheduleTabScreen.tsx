import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ScreenContainer } from '@/components/ScreenContainer';
import { AccountButton } from '@/components/AccountButton';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingState } from '@/components/ui/LoadingState';
import { Button } from '@/components/ui/Button';
import { useActiveProject } from '@/context/ActiveProjectContext';
import { useHomeQuery } from '@/features/home/hooks';
import { useScheduleQuery } from '@/features/schedule/hooks';
import { readApiError } from '@/api/client';
import { useChromeInsets } from '@/hooks/useChromeInsets';
import { colors, radius, spacing, typography } from '@/theme';

type DayState = 'done' | 'today' | 'soon';

function startOfWeek(d: Date): Date {
  const x = new Date(d);
  const day = x.getDay();
  x.setDate(x.getDate() - day);
  x.setHours(0, 0, 0, 0);
  return x;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export default function ScheduleTabScreen() {
  const { projectId } = useActiveProject();
  const homeQ = useHomeQuery(projectId);
  const scheduleQ = useScheduleQuery(projectId ?? undefined);
  const [weekAnchor] = useState(() => startOfWeek(new Date()));

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekAnchor);
      d.setDate(weekAnchor.getDate() + i);
      return d;
    });
  }, [weekAnchor]);

  const today = new Date();
  const cards = useMemo(() => {
    const days = scheduleQ.data ?? [];
    return days.map(day => {
      const date = new Date(day.date);
      let state: DayState = 'soon';
      if (date < today && !isSameDay(date, today)) state = 'done';
      else if (isSameDay(date, today)) state = 'today';
      const progress = state === 'done' ? 100 : state === 'today' ? 60 : 0;
      return { ...day, state, progress, date };
    });
  }, [scheduleQ.data, today]);

  const summary = useMemo(() => {
    const done = cards.filter(c => c.state === 'done').length;
    const shooting = cards.filter(c => c.state === 'today').length;
    const upcoming = cards.filter(c => c.state === 'soon').length;
    return { done, shooting, upcoming };
  }, [cards]);

  const displayDate = homeQ.data?.nextShootDay?.date
    ? new Date(homeQ.data.nextShootDay.date)
    : today;
  const { appTabBarReserve } = useChromeInsets();

  return (
    <ScreenContainer
      scroll
      edges={['top', 'left', 'right']}
      contentStyle={{ paddingBottom: appTabBarReserve }}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.wordmark}>
            CIRCUI<Text style={styles.wordmarkAccent}>IT</Text>
          </Text>
          <Text style={styles.title}>Shoot schedule</Text>
          <Text style={styles.date}>
            {displayDate.toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </Text>
        </View>
        <AccountButton />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.weekStrip}>
        {weekDays.map(d => {
          const selected = isSameDay(d, today);
          return (
            <View key={d.toISOString()} style={styles.weekCell}>
              <Text style={styles.weekDay}>
                {d.toLocaleDateString('en-GB', { weekday: 'narrow' })}
              </Text>
              <View style={[styles.weekNum, selected && styles.weekNumActive]}>
                <Text style={[styles.weekNumText, selected && styles.weekNumTextActive]}>
                  {d.getDate()}
                </Text>
              </View>
            </View>
          );
        })}
      </ScrollView>

      {!projectId ? (
        <EmptyState
          title="No project yet"
          body="Create or join a project to see the shoot schedule."
        />
      ) : scheduleQ.isLoading ? (
        <LoadingState />
      ) : scheduleQ.error ? (
        <EmptyState
          title="Couldn't load schedule"
          body={readApiError(scheduleQ.error)}
          action={<Button title="Retry" onPress={() => scheduleQ.refetch()} />}
        />
      ) : (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.cards}>
            {cards.map(card => (
              <View
                key={card.id}
                style={[
                  styles.card,
                  card.state === 'today' && styles.cardToday,
                  card.state === 'soon' && styles.cardSoon,
                ]}
              >
                <Text style={[styles.cardTag, card.state === 'soon' && styles.muted]}>
                  {card.state === 'done' ? 'DONE' : card.state === 'today' ? 'TODAY' : 'SOON'}
                </Text>
                <Text style={[styles.cardTitle, card.state === 'soon' && styles.muted]}>
                  {card.location ?? `Day ${card.dayNumber}`}
                </Text>
                <Text style={[styles.cardPct, card.state === 'soon' && styles.muted]}>
                  {card.progress}%
                </Text>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${card.progress}%` }]} />
                </View>
              </View>
            ))}
          </ScrollView>

          <View style={styles.summaryRow}>
            <SummaryCard label="Done" value={summary.done} />
            <SummaryCard label="Shooting" value={summary.shooting} highlight />
            <SummaryCard label="Upcoming" value={summary.upcoming} />
          </View>
        </>
      )}
    </ScreenContainer>
  );
}

function SummaryCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <View style={[styles.summaryCard, highlight && styles.summaryCardActive]}>
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
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
  date: { ...typography.body, color: colors.textMuted, marginTop: spacing.xs },
  weekStrip: { marginBottom: spacing.lg },
  weekCell: { alignItems: 'center', marginRight: spacing.lg, width: 36 },
  weekDay: { ...typography.caption, color: colors.textMuted, marginBottom: spacing.xs },
  weekNum: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekNumActive: { backgroundColor: colors.brand },
  weekNumText: { ...typography.bodyStrong, color: colors.textPrimary },
  weekNumTextActive: { color: colors.onBrand },
  cards: { marginBottom: spacing.xl },
  card: {
    width: 160,
    marginRight: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.card,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  cardToday: {
    backgroundColor: colors.brandSoft,
    borderColor: colors.brand,
  },
  cardSoon: {
    borderStyle: 'dashed',
    opacity: 0.75,
  },
  cardTag: { ...typography.micro, color: colors.brand, marginBottom: spacing.sm },
  cardTitle: { ...typography.heading, color: colors.textPrimary },
  cardPct: { ...typography.caption, color: colors.brand, marginVertical: spacing.sm },
  muted: { color: colors.textMuted },
  progressTrack: {
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.ringTrack,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: colors.brand },
  summaryRow: { flexDirection: 'row', gap: spacing.sm },
  summaryCard: {
    flex: 1,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  summaryCardActive: { backgroundColor: colors.brandSoft },
  summaryValue: { fontSize: 24, fontWeight: '800', color: colors.brand },
  summaryLabel: { ...typography.caption, color: colors.textSecondary },
});
