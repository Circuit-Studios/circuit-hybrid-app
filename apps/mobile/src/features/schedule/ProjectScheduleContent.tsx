import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ActivityIndicator,
  Alert,
  LayoutAnimation,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  UIManager,
  View,
} from 'react-native';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { StatusBadge } from '@/components/StatusBadge';
import { SegmentedControl, type SegmentOption } from '@/components/SegmentedControl';
import { ProjectHeaderAction, projectScreenStyles } from '@/components/project/ProjectScreenScaffold';
import { ShootDaySheet } from '@/features/schedule/ShootDaySheet';
import { listShootDays, deleteShootDay, listConflicts } from '@/api/workspace';
import { getShootingPlan, applyShootingPlanToSchedule } from '@/api/taskSuggestions';
import { qk } from '@/api/queryKeys';
import { readApiError } from '@/api/client';
import { useProjectRoom } from '@/realtime/useProjectRoom';
import { colors, conflictSeverityMeta, radius, spacing, typography } from '@/theme';
import type { ConflictSeverity, ShootDay } from '@/api/types';

type ScheduleView = 'board' | 'calendar';

const VIEWS: SegmentOption<ScheduleView>[] = [
  { value: 'board', label: 'Board' },
  { value: 'calendar', label: 'Calendar' },
];

const SEVERITY_RANK: Record<ConflictSeverity, number> = { INFO: 0, WARNING: 1, CRITICAL: 2 };

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

/** Smoothly animate the next layout change (expand/collapse). */
function animateNext() {
  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
}

export interface ProjectScheduleContentProps {
  projectId: string;
}

/** Shoot schedule body for the active project (board/agenda + conflict scan). */
export function ProjectScheduleContent({ projectId }: ProjectScheduleContentProps) {
  const qc = useQueryClient();
  const pid = projectId;
  useProjectRoom(pid);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingDay, setEditingDay] = useState<ShootDay | null>(null);
  const [view, setView] = useState<ScheduleView>('board');
  const [selectedDate, setSelectedDate] = useState(() => startOfDay(new Date()));
  const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(new Date()));

  function openCreateSheet() {
    setEditingDay(null);
    setSheetOpen(true);
  }

  function openEditSheet(day: ShootDay) {
    setEditingDay(day);
    setSheetOpen(true);
  }

  function closeSheet() {
    setSheetOpen(false);
    setEditingDay(null);
  }

  const scheduleQ = useQuery({
    queryKey: qk.schedule(pid),
    queryFn: () => listShootDays(pid),
    enabled: Boolean(pid),
  });

  const conflictsQ = useQuery({
    queryKey: qk.conflicts(pid),
    queryFn: () => listConflicts(pid),
    enabled: Boolean(pid),
  });

  // Used only to know whether an AI plan exists for the empty-state CTA.
  const planQ = useQuery({
    queryKey: ['shooting-plan', pid, undefined],
    queryFn: () => getShootingPlan(pid),
    enabled: Boolean(pid),
    retry: false,
  });

  const days = scheduleQ.data ?? [];
  const conflicts = conflictsQ.data ?? [];
  const topSeverity = conflicts.reduce<ConflictSeverity | null>((max, c) => {
    if (!max || SEVERITY_RANK[c.severity] > SEVERITY_RANK[max]) return c.severity;
    return max;
  }, null);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteShootDay(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.schedule(pid) });
      void qc.invalidateQueries({ queryKey: qk.health(pid) });
      void qc.invalidateQueries({ queryKey: qk.conflicts(pid) });
    },
  });

  const applyPlan = useMutation({
    mutationFn: () => applyShootingPlanToSchedule(pid),
    onSuccess: (result) => {
      void qc.invalidateQueries({ queryKey: qk.schedule(pid) });
      void qc.invalidateQueries({ queryKey: qk.health(pid) });
      Alert.alert(
        'Schedule built',
        result.created > 0
          ? `${result.created} shoot day${result.created === 1 ? '' : 's'} added from the AI plan.`
          : 'All shoot days from the plan were already on the schedule.',
      );
    },
    onError: (err) => Alert.alert('Could not apply plan', readApiError(err)),
  });

  function confirmRemove(day: ShootDay) {
    const dateLabel = new Date(day.date).toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
    Alert.alert(
      'Remove shoot day?',
      `Day ${day.dayNumber} (${dateLabel}) will be removed from the schedule. This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => deleteMutation.mutate(day.id) },
      ],
    );
  }

  const planExists = Boolean(planQ.data?.plan);
  const upcomingDay =
    days.find((day) => new Date(day.date) >= new Date()) ?? (days.length > 0 ? days[0] : null);
  const preferredCalendarDate = useMemo(
    () => (upcomingDay ? startOfDay(new Date(upcomingDay.date)) : null),
    [upcomingDay],
  );

  useEffect(() => {
    if (!preferredCalendarDate) return;
    setSelectedDate((current) => {
      const hasShootDay = days.some((day) => isSameDate(new Date(day.date), current));
      return hasShootDay ? current : preferredCalendarDate;
    });
    setVisibleMonth((current) =>
      isSameMonth(current, preferredCalendarDate) ? current : startOfMonth(preferredCalendarDate),
    );
  }, [days, preferredCalendarDate]);

  return (
    <>
      <View style={styles.toolbar}>
        <View style={styles.toolbarCopy}>
          <Text style={styles.eyebrow}>Production timeline</Text>
          <Text style={styles.body}>
            Plan shoot days, scenes, call readiness, and conflict scanning in one place.
          </Text>
        </View>
        <ProjectHeaderAction label="+ Day" onPress={openCreateSheet} />
      </View>

      {days.length > 0 ? (
        <View style={styles.summaryStrip}>
          <SummaryMetric label="Shoot days" value={String(days.length)} />
          <SummaryMetric
            label="Next up"
            value={upcomingDay ? `Day ${upcomingDay.dayNumber}` : 'None'}
          />
          <SummaryMetric
            label="Conflicts"
            value={String(conflicts.length)}
            tone={conflicts.length > 0 ? 'danger' : 'success'}
          />
        </View>
      ) : null}

      {topSeverity ? (
        <View
          style={[
            styles.conflictBanner,
            { borderLeftColor: conflictSeverityMeta[topSeverity].color },
          ]}
        >
          <StatusBadge
            label={`${conflicts.length} conflict${conflicts.length === 1 ? '' : 's'}`}
            tone={conflictSeverityMeta[topSeverity].tone}
          />
          <Text style={styles.conflictText} numberOfLines={2}>
            {conflicts[0]?.title}
          </Text>
        </View>
      ) : null}

      {days.length > 0 ? (
        <SegmentedControl options={VIEWS} value={view} onChange={setView} style={styles.segment} />
      ) : null}

      {scheduleQ.isLoading ? (
        <View style={projectScreenStyles.center}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : scheduleQ.error ? (
        <EmptyState
          title="Couldn't load schedule"
          body={readApiError(scheduleQ.error)}
          action={<PrimaryButton title="Retry" onPress={() => scheduleQ.refetch()} />}
        />
      ) : days.length === 0 ? (
        <EmptyState
          title="Build your shoot calendar"
          body={
            planExists
              ? 'Apply your AI shooting plan to auto-fill shoot days, or add one manually.'
              : 'Add your first shoot day to unlock conflict detection, call-time tracking, and scene planning.'
          }
          action={
            planExists ? (
              <View style={styles.emptyActions}>
                <PrimaryButton
                  title="Apply AI shooting plan"
                  loading={applyPlan.isPending}
                  onPress={() => applyPlan.mutate()}
                />
                <Pressable onPress={openCreateSheet} hitSlop={8}>
                  <Text style={styles.secondaryLink}>Add manually instead</Text>
                </Pressable>
              </View>
            ) : (
              <PrimaryButton title="Add first shoot day" onPress={openCreateSheet} />
            )
          }
        />
      ) : view === 'calendar' ? (
        <CalendarView
          days={days}
          selectedDate={selectedDate}
          visibleMonth={visibleMonth}
          onSelectDate={setSelectedDate}
          onChangeMonth={setVisibleMonth}
          onAddDay={openCreateSheet}
          onEditDay={openEditSheet}
          onRemoveDay={confirmRemove}
        />
      ) : (
        <View style={styles.timeline}>
          {days.map((day, idx) => (
            <BoardDay
              key={day.id}
              day={day}
              isLast={idx === days.length - 1}
              onEdit={() => openEditSheet(day)}
            />
          ))}
        </View>
      )}

      <ShootDaySheet
        visible={sheetOpen}
        onClose={closeSheet}
        projectId={pid}
        existingDays={days.map((d) => d.dayNumber)}
        editing={editingDay}
      />
    </>
  );
}

function formatDate(date: Date): string {
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatSelectedDate(date: Date): string {
  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

function addMonths(date: Date, months: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

function isSameDate(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

function dateKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/** 6x7 month grid starting on the Sunday on/before the 1st of the month. */
function getMonthMatrix(month: Date): Date[] {
  const first = startOfMonth(month);
  const gridStart = addDays(first, -first.getDay());
  return Array.from({ length: 42 }, (_, idx) => addDays(gridStart, idx));
}

const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'] as const;

function formatSceneNumbers(day: ShootDay): string | null {
  const scenes = day.scenes ?? [];
  if (scenes.length === 0) return null;
  return scenes.map((item) => item.scene.sceneNumber).join(', ');
}

function parseScheduleNotes(notes: string | null): {
  departments: string | null;
  scenes: string | null;
  body: string | null;
} {
  if (!notes) return { departments: null, scenes: null, body: null };

  let cleaned = notes.trim();
  const departmentMatch = cleaned.match(/Departments:\s*([^\n.]+)/i);
  const departments = departmentMatch?.[1]?.trim() ?? null;
  if (departmentMatch) cleaned = cleaned.replace(departmentMatch[0], '');

  const sceneMatch = cleaned.match(/Scenes:\s*([^\n.]+)/i);
  const scenes = sceneMatch?.[1]?.trim() ?? null;
  if (sceneMatch) cleaned = cleaned.replace(sceneMatch[0], '');

  cleaned = cleaned
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .join(' ')
    .replace(/\s{2,}/g, ' ')
    .trim();

  return { departments, scenes, body: cleaned.length > 0 ? cleaned : null };
}

/** Scene label only when real scene data exists, else null (no placeholder). */
function realSceneLabel(
  day: ShootDay,
  notes: ReturnType<typeof parseScheduleNotes>,
): string | null {
  const explicit = formatSceneNumbers(day) ?? notes.scenes;
  if (explicit) return explicit;
  const count = day.scenes?.length ?? 0;
  return count > 0 ? `${count} scene${count === 1 ? '' : 's'}` : null;
}

function BoardDay({
  day,
  isLast,
  onEdit,
}: {
  day: ShootDay;
  isLast: boolean;
  onEdit: () => void;
}) {
  const dateObj = new Date(day.date);
  const isPast = startOfDay(dateObj) < startOfDay(new Date());
  return (
    <View style={styles.timelineRow}>
      <View style={styles.timelineGutter}>
        <View style={[styles.dayBullet, isPast && styles.dayBulletPast]}>
          <Text style={styles.dayBulletLabel}>Day</Text>
          <Text style={styles.dayBulletText}>{day.dayNumber}</Text>
        </View>
        {!isLast ? <View style={styles.timelineLine} /> : null}
      </View>
      <Card style={styles.dayCard} variant="default">
        <View style={styles.dayHeader}>
          <View style={styles.dayHeaderCopy}>
            <Text style={styles.dayDate}>{formatDate(dateObj)}</Text>
            <Text style={styles.dayLoc} numberOfLines={2}>
              {day.location ?? 'Location TBD'}
            </Text>
          </View>
          <View style={[styles.callPill, day.callTimeUserId && styles.callPillReady]}>
            <Text style={[styles.callPillText, day.callTimeUserId && styles.callPillTextReady]}>
              {day.callTimeUserId ? 'Call set' : 'No call'}
            </Text>
          </View>
        </View>

        {day.timeOfDay || day.personsRequired != null ? (
          <View style={styles.dayTagRow}>
            {day.timeOfDay ? (
              <View style={styles.dayTag}>
                <Text style={styles.dayTagText}>
                  {day.timeOfDay === 'NIGHT' ? '🌙 Night' : '☀️ Day'}
                </Text>
              </View>
            ) : null}
            {day.personsRequired != null ? (
              <View style={styles.dayTag}>
                <Text style={styles.dayTagText}>👥 {day.personsRequired} persons</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {day.notes ? <Text style={styles.dayNotes}>{day.notes}</Text> : null}

        <View style={styles.dayFooter}>
          <Text style={styles.dayFooterText}>{isPast ? 'Past shoot day' : 'Upcoming shoot day'}</Text>
          <Pressable onPress={onEdit} hitSlop={8}>
            <Text style={styles.dayEdit}>Edit</Text>
          </Pressable>
        </View>
      </Card>
    </View>
  );
}

function CalendarView({
  days,
  selectedDate,
  visibleMonth,
  onSelectDate,
  onChangeMonth,
  onAddDay,
  onEditDay,
  onRemoveDay,
}: {
  days: ShootDay[];
  selectedDate: Date;
  visibleMonth: Date;
  onSelectDate: (date: Date) => void;
  onChangeMonth: (date: Date) => void;
  onAddDay: () => void;
  onEditDay: (day: ShootDay) => void;
  onRemoveDay: (day: ShootDay) => void;
}) {
  const today = startOfDay(new Date());
  const monthWeeks = useMemo(() => {
    const matrix = getMonthMatrix(visibleMonth);
    const weeks: Date[][] = [];
    for (let i = 0; i < matrix.length; i += 7) weeks.push(matrix.slice(i, i + 7));
    return weeks;
  }, [visibleMonth]);
  const shootDayByKey = useMemo(() => {
    const map = new Map<string, ShootDay>();
    for (const day of days) map.set(dateKey(new Date(day.date)), day);
    return map;
  }, [days]);
  const selectedShootDay = useMemo(
    () => days.find((day) => isSameDate(new Date(day.date), selectedDate)) ?? null,
    [days, selectedDate],
  );
  const monthShootDays = useMemo(
    () =>
      days
        .filter((day) => isSameMonth(new Date(day.date), visibleMonth))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [days, visibleMonth],
  );

  const [expanded, setExpanded] = useState(true);

  function handleSelectDate(date: Date) {
    animateNext();
    const sameDay = isSameDate(date, selectedDate);
    if (!isSameMonth(date, visibleMonth)) onChangeMonth(startOfMonth(date));
    onSelectDate(date);
    setExpanded(sameDay ? !expanded : true);
  }

  function moveMonth(delta: number) {
    onChangeMonth(addMonths(visibleMonth, delta));
  }

  function goToToday() {
    animateNext();
    onChangeMonth(startOfMonth(today));
    onSelectDate(today);
    setExpanded(true);
  }

  return (
    <View style={styles.calendar}>
      <Card variant="default" style={styles.calendarShell}>
        <View style={styles.calendarHeader}>
          <View style={styles.calendarHeaderCopy}>
            <Text style={styles.calendarMonth}>
              {visibleMonth.toLocaleDateString(undefined, { month: 'long' })}
            </Text>
            <Text style={styles.calendarYear}>{visibleMonth.getFullYear()}</Text>
          </View>
          <View style={styles.monthControls}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Jump to today"
              onPress={goToToday}
              style={({ pressed }) => [styles.todayButton, pressed && styles.monthButtonPressed]}
            >
              <Text style={styles.todayButtonText}>Today</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Previous month"
              onPress={() => moveMonth(-1)}
              style={({ pressed }) => [styles.monthButton, pressed && styles.monthButtonPressed]}
            >
              <Text style={styles.monthButtonText}>‹</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Next month"
              onPress={() => moveMonth(1)}
              style={({ pressed }) => [styles.monthButton, pressed && styles.monthButtonPressed]}
            >
              <Text style={styles.monthButtonText}>›</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.weekdayHeader}>
          {WEEKDAY_LABELS.map((label, idx) => (
            <View key={`${label}-${idx}`} style={styles.weekdayCell}>
              <Text style={styles.weekdayLabel}>{label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.monthGrid}>
          {monthWeeks.map((week) => (
            <View key={dateKey(week[0]!)} style={styles.monthWeekRow}>
              {week.map((date) => (
                <CalendarGridCell
                  key={dateKey(date)}
                  date={date}
                  selected={isSameDate(date, selectedDate)}
                  today={isSameDate(date, today)}
                  shootDay={shootDayByKey.get(dateKey(date)) ?? null}
                  inMonth={isSameMonth(date, visibleMonth)}
                  onPress={() => handleSelectDate(date)}
                />
              ))}
            </View>
          ))}
        </View>
      </Card>

      <View style={styles.agendaHeader}>
        <Text style={styles.agendaHeaderTitle}>This month</Text>
        <Text style={styles.agendaHeaderCount}>
          {monthShootDays.length} shoot day{monthShootDays.length === 1 ? '' : 's'}
        </Text>
      </View>

      {!selectedShootDay ? (
        <Card variant="glass" style={styles.agendaEmpty}>
          <Text style={styles.agendaEmptyDate}>{formatSelectedDate(selectedDate)}</Text>
          <Text style={styles.agendaEmptyText}>No shoot day scheduled on this date.</Text>
          <Pressable onPress={onAddDay} hitSlop={8}>
            <Text style={styles.agendaEmptyAdd}>+ Add shoot day</Text>
          </Pressable>
        </Card>
      ) : null}

      {monthShootDays.length > 0 ? (
        <Card variant="default" padded={false} style={styles.agendaList}>
          {monthShootDays.map((day, idx) => {
            const isSelected = isSameDate(new Date(day.date), selectedDate);
            return (
              <AgendaRow
                key={day.id}
                day={day}
                selected={isSelected}
                expanded={isSelected && expanded}
                isLast={idx === monthShootDays.length - 1}
                onPress={() => handleSelectDate(startOfDay(new Date(day.date)))}
                onEdit={() => onEditDay(day)}
                onRemove={() => onRemoveDay(day)}
              />
            );
          })}
        </Card>
      ) : null}
    </View>
  );
}

function CalendarGridCell({
  date,
  selected,
  today,
  shootDay,
  inMonth,
  onPress,
}: {
  date: Date;
  selected: boolean;
  today: boolean;
  shootDay: ShootDay | null;
  inMonth: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`${formatSelectedDate(date)}${shootDay ? `, shoot day ${shootDay.dayNumber}` : ''}`}
      onPress={onPress}
      style={({ pressed }) => [styles.gridCell, pressed && styles.gridCellPressed]}
    >
      <View
        style={[
          styles.gridDisc,
          today && !selected && styles.gridDiscToday,
          selected && styles.gridDiscSelected,
        ]}
      >
        <Text
          style={[
            styles.gridDateNumber,
            !inMonth && !selected && styles.gridDateMuted,
            today && !selected && styles.gridDateToday,
            selected && styles.gridDateSelected,
          ]}
        >
          {date.getDate()}
        </Text>
      </View>
      {shootDay ? (
        <View style={[styles.gridEvent, selected && styles.gridEventSelected]}>
          <Text
            style={[styles.gridEventText, !inMonth && styles.gridEventTextMuted]}
            numberOfLines={1}
          >
            Day {shootDay.dayNumber}
          </Text>
        </View>
      ) : (
        <View style={styles.gridEventPlaceholder} />
      )}
    </Pressable>
  );
}

function AgendaRow({
  day,
  selected,
  expanded,
  isLast,
  onPress,
  onEdit,
  onRemove,
}: {
  day: ShootDay;
  selected: boolean;
  expanded: boolean;
  isLast: boolean;
  onPress: () => void;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const dateObj = new Date(day.date);
  const notes = parseScheduleNotes(day.notes);
  const scenes = realSceneLabel(day, notes);
  const hasTags = Boolean(day.timeOfDay) || day.personsRequired != null;

  return (
    <View
      style={[
        styles.agendaRow,
        !isLast && styles.agendaRowDivider,
        selected && styles.agendaRowSelected,
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected, expanded }}
        accessibilityLabel={`Shoot day ${day.dayNumber}, ${expanded ? 'collapse' : 'expand'} details`}
        onPress={onPress}
        style={styles.agendaRowHead}
      >
        <View style={[styles.agendaDateBox, selected && styles.agendaDateBoxSelected]}>
          <Text style={[styles.agendaDateMonth, selected && styles.agendaDateTextSelected]}>
            {dateObj.toLocaleDateString(undefined, { month: 'short' })}
          </Text>
          <Text style={[styles.agendaDateDay, selected && styles.agendaDateTextSelected]}>
            {dateObj.getDate()}
          </Text>
        </View>
        <View style={styles.agendaRowBody}>
          <View style={styles.agendaRowTop}>
            <Text style={styles.agendaRowTitle}>Day {day.dayNumber}</Text>
            <Text style={[styles.agendaCall, day.callTimeUserId && styles.agendaCallReady]}>
              {day.callTimeUserId ? 'Call set' : 'Call TBD'}
            </Text>
          </View>
          <Text style={styles.agendaRowLoc} numberOfLines={1}>
            {day.location ?? 'Location TBD'}
          </Text>
        </View>
        <Text style={[styles.agendaChevron, expanded && styles.agendaChevronOpen]}>›</Text>
      </Pressable>

      {expanded ? (
        <View style={styles.agendaDetail}>
          {hasTags ? (
            <View style={styles.dayTagRow}>
              {day.timeOfDay ? (
                <View style={styles.dayTag}>
                  <Text style={styles.dayTagText}>
                    {day.timeOfDay === 'NIGHT' ? '🌙 Night' : '☀️ Day'}
                  </Text>
                </View>
              ) : null}
              {day.personsRequired != null ? (
                <View style={styles.dayTag}>
                  <Text style={styles.dayTagText}>👥 {day.personsRequired} persons</Text>
                </View>
              ) : null}
            </View>
          ) : null}

          {scenes ? <DetailRow label="Scenes" value={scenes} /> : null}
          {notes.departments ? <DetailRow label="Departments" value={notes.departments} /> : null}
          {notes.body ? <DetailRow label="Notes" value={notes.body} /> : null}

          <View style={styles.agendaActions}>
            <Pressable onPress={onEdit} hitSlop={8}>
              <Text style={styles.agendaEdit}>Edit</Text>
            </Pressable>
            <Pressable onPress={onRemove} hitSlop={8}>
              <Text style={styles.agendaRemove}>Remove</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

function SummaryMetric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: 'success' | 'danger';
}) {
  return (
    <View style={styles.summaryMetric}>
      <Text
        style={[
          styles.summaryValue,
          tone === 'success' && styles.summaryValueSuccess,
          tone === 'danger' && styles.summaryValueDanger,
        ]}
        numberOfLines={1}
      >
        {value}
      </Text>
      <Text style={styles.summaryLabel} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { ...typography.body, color: colors.textSecondary },
  eyebrow: {
    ...typography.micro,
    color: colors.brandStrong,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  toolbarCopy: { flex: 1 },
  summaryStrip: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  summaryMetric: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceGlass,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  summaryValue: { ...typography.bodyStrong, color: colors.textPrimary },
  summaryValueSuccess: { color: colors.success },
  summaryValueDanger: { color: colors.danger },
  summaryLabel: { ...typography.micro, color: colors.textMuted, marginTop: 2 },
  segment: { marginBottom: spacing.md },
  conflictBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderRadius: radius.md,
    borderLeftWidth: 3,
    backgroundColor: colors.surfaceMuted,
  },
  conflictText: { ...typography.caption, color: colors.textSecondary, flex: 1 },
  emptyActions: { gap: spacing.sm, alignItems: 'center' },
  secondaryLink: { ...typography.bodyStrong, color: colors.textSecondary },
  timeline: { marginTop: spacing.xs, paddingBottom: 132 },
  timelineRow: { flexDirection: 'row', alignItems: 'flex-start' },
  timelineGutter: { width: 40, alignItems: 'center' },
  dayBullet: {
    width: 34,
    height: 34,
    borderRadius: 999,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayBulletPast: { backgroundColor: colors.surfaceMuted },
  dayBulletLabel: { color: colors.accentInk, fontSize: 8, fontWeight: '800', lineHeight: 9 },
  dayBulletText: { color: colors.accentInk, fontSize: 13, fontWeight: '800', lineHeight: 15 },
  timelineLine: { width: 2, flex: 1, backgroundColor: colors.borderSubtle, marginTop: 6 },
  dayCard: { flex: 1, marginLeft: spacing.sm, marginBottom: spacing.lg, gap: spacing.md },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  dayHeaderCopy: { flex: 1, gap: 4 },
  dayDate: { ...typography.bodyStrong, color: colors.textPrimary, fontSize: 17 },
  dayLoc: { ...typography.bodyStrong, color: colors.textSecondary, textTransform: 'uppercase' },
  callPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
  },
  callPillReady: { backgroundColor: colors.brandSoft },
  callPillText: { ...typography.micro, color: colors.textMuted },
  callPillTextReady: { color: colors.brandStrong },
  dayNotes: { ...typography.caption, color: colors.textSecondary, lineHeight: 20 },
  dayFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.xs,
  },
  dayFooterText: { ...typography.micro, color: colors.textMuted },
  dayEdit: { ...typography.caption, color: colors.brand, fontWeight: '600' },
  dayTagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.sm },
  dayTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dayTagText: { ...typography.micro, color: colors.textSecondary },
  calendar: { gap: spacing.md, paddingBottom: 132 },
  calendarShell: { gap: spacing.md },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  calendarHeaderCopy: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs },
  calendarMonth: { ...typography.title, color: colors.textPrimary },
  calendarYear: { ...typography.title, color: colors.brandStrong },
  monthControls: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  todayButton: {
    paddingHorizontal: spacing.md,
    height: 34,
    borderRadius: radius.pill,
    backgroundColor: colors.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.xs,
  },
  todayButtonText: { ...typography.caption, color: colors.brandStrong, fontWeight: '700' },
  monthButton: {
    width: 34,
    height: 34,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthButtonPressed: { opacity: 0.75 },
  monthButtonText: { color: colors.textPrimary, fontSize: 22, fontWeight: '700', lineHeight: 24 },
  weekdayHeader: { flexDirection: 'row' },
  weekdayCell: { flex: 1, alignItems: 'center', paddingBottom: spacing.xs },
  weekdayLabel: { ...typography.micro, color: colors.textMuted, letterSpacing: 0 },
  monthGrid: { flexDirection: 'column' },
  monthWeekRow: { flexDirection: 'row' },
  gridCell: {
    flex: 1,
    minHeight: 58,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingVertical: 3,
    gap: 2,
  },
  gridCellPressed: { opacity: 0.7 },
  gridDisc: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  gridDiscToday: { borderColor: colors.brand },
  gridDiscSelected: { backgroundColor: colors.brand },
  gridDateNumber: { color: colors.textPrimary, fontSize: 15, fontWeight: '600' },
  gridDateMuted: { color: colors.textMuted, opacity: 0.6 },
  gridDateToday: { color: colors.brandStrong, fontWeight: '800' },
  gridDateSelected: { color: colors.accentInk, fontWeight: '800' },
  gridEvent: {
    maxWidth: '92%',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: radius.sm,
    backgroundColor: colors.brandSoft,
  },
  gridEventSelected: { backgroundColor: colors.brandSoft },
  gridEventText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.brandStrong,
    letterSpacing: 0,
  },
  gridEventTextMuted: { color: colors.textMuted },
  gridEventPlaceholder: { height: 13 },
  agendaHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  agendaHeaderTitle: { ...typography.bodyStrong, color: colors.textPrimary },
  agendaHeaderCount: { ...typography.caption, color: colors.textMuted },
  agendaEmpty: { gap: spacing.xs },
  agendaEmptyDate: { ...typography.bodyStrong, color: colors.textPrimary, fontSize: 17 },
  agendaEmptyText: { ...typography.caption, color: colors.textSecondary },
  agendaEmptyAdd: { ...typography.caption, color: colors.brand, fontWeight: '700', marginTop: 2 },
  agendaList: { overflow: 'hidden' },
  agendaRow: { paddingHorizontal: spacing.sm },
  agendaRowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderSubtle,
  },
  agendaRowSelected: { backgroundColor: colors.brandSoft },
  agendaRowHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  agendaDateBox: {
    width: 50,
    height: 54,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  agendaDateBoxSelected: { backgroundColor: colors.brand },
  agendaDateTextSelected: { color: colors.accentInk },
  agendaDateMonth: { ...typography.micro, color: colors.textMuted, textTransform: 'uppercase' },
  agendaDateDay: { color: colors.textPrimary, fontSize: 20, fontWeight: '900' },
  agendaRowBody: { flex: 1, gap: 3 },
  agendaRowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  agendaRowTitle: { ...typography.bodyStrong, color: colors.textPrimary, flex: 1 },
  agendaRowLoc: { ...typography.caption, color: colors.textSecondary, fontWeight: '700' },
  agendaCall: { ...typography.micro, color: colors.textMuted },
  agendaCallReady: { color: colors.brandStrong },
  agendaChevron: {
    color: colors.textMuted,
    fontSize: 22,
    fontWeight: '700',
    transform: [{ rotate: '90deg' }],
  },
  agendaChevronOpen: { transform: [{ rotate: '-90deg' }], color: colors.brandStrong },
  agendaDetail: {
    gap: spacing.sm,
    paddingBottom: spacing.md,
    paddingLeft: 50 + spacing.md,
  },
  agendaActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xl,
    paddingTop: spacing.xs,
  },
  agendaEdit: { ...typography.caption, color: colors.brand, fontWeight: '700' },
  agendaRemove: { ...typography.caption, color: colors.danger, fontWeight: '700' },
  detailRow: { gap: 2 },
  detailLabel: { ...typography.micro, color: colors.textMuted, textTransform: 'uppercase' },
  detailValue: { ...typography.caption, color: colors.textPrimary, lineHeight: 20 },
});
