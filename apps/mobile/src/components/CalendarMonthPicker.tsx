import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '@/theme';
import { fontFamily } from '@/theme/fonts';

interface CalendarMonthPickerProps {
  value: Date | null;
  onChange: (next: Date) => void;
  minimumDate?: Date;
  maximumDate?: Date;
}

const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'] as const;

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

/**
 * Month-grid date picker that matches the Schedule tab calendar so every
 * calendar surface in the app shares the same look and font.
 */
export function CalendarMonthPicker({
  value,
  onChange,
  minimumDate,
  maximumDate,
}: CalendarMonthPickerProps) {
  const today = startOfDay(new Date());
  const [visibleMonth, setVisibleMonth] = useState(() =>
    startOfMonth(value ?? today),
  );

  const monthWeeks = useMemo(() => {
    const matrix = getMonthMatrix(visibleMonth);
    const weeks: Date[][] = [];
    for (let i = 0; i < matrix.length; i += 7) weeks.push(matrix.slice(i, i + 7));
    return weeks;
  }, [visibleMonth]);

  const minDay = minimumDate ? startOfDay(minimumDate) : null;
  const maxDay = maximumDate ? startOfDay(maximumDate) : null;

  function isDisabled(date: Date): boolean {
    if (minDay && date < minDay) return true;
    if (maxDay && date > maxDay) return true;
    return false;
  }

  function moveMonth(delta: number) {
    setVisibleMonth((prev) => addMonths(prev, delta));
  }

  function goToToday() {
    setVisibleMonth(startOfMonth(today));
    if (!isDisabled(today)) onChange(today);
  }

  function handleSelect(date: Date) {
    if (isDisabled(date)) return;
    if (!isSameMonth(date, visibleMonth)) setVisibleMonth(startOfMonth(date));
    onChange(date);
  }

  return (
    <View style={styles.shell}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.month}>
            {visibleMonth.toLocaleDateString(undefined, { month: 'long' })}
          </Text>
          <Text style={styles.year}>{visibleMonth.getFullYear()}</Text>
        </View>
        <View style={styles.controls}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Jump to today"
            onPress={goToToday}
            style={({ pressed }) => [styles.todayButton, pressed && styles.buttonPressed]}
          >
            <Text style={styles.todayButtonText}>Today</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Previous month"
            onPress={() => moveMonth(-1)}
            style={({ pressed }) => [styles.monthButton, pressed && styles.buttonPressed]}
          >
            <Text style={styles.monthButtonText}>‹</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Next month"
            onPress={() => moveMonth(1)}
            style={({ pressed }) => [styles.monthButton, pressed && styles.buttonPressed]}
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

      <View style={styles.grid}>
        {monthWeeks.map((week) => (
          <View key={dateKey(week[0]!)} style={styles.weekRow}>
            {week.map((date) => {
              const selected = value ? isSameDate(date, value) : false;
              const isToday = isSameDate(date, today);
              const inMonth = isSameMonth(date, visibleMonth);
              const disabled = isDisabled(date);
              return (
                <Pressable
                  key={dateKey(date)}
                  accessibilityRole="button"
                  accessibilityState={{ selected, disabled }}
                  disabled={disabled}
                  onPress={() => handleSelect(date)}
                  style={({ pressed }) => [styles.cell, pressed && !disabled && styles.cellPressed]}
                >
                  <View
                    style={[
                      styles.disc,
                      isToday && !selected && styles.discToday,
                      selected && styles.discSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.dateNumber,
                        !inMonth && !selected && styles.dateMuted,
                        isToday && !selected && styles.dateToday,
                        selected && styles.dateSelected,
                        disabled && styles.dateDisabled,
                      ]}
                    >
                      {date.getDate()}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { gap: spacing.md },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  headerCopy: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs },
  month: { ...typography.title, color: colors.textPrimary },
  year: { ...typography.title, color: colors.brandStrong },
  controls: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  todayButton: {
    paddingHorizontal: spacing.md,
    height: 34,
    borderRadius: radius.pill,
    backgroundColor: colors.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.xs,
  },
  todayButtonText: {
    ...typography.caption,
    fontFamily: fontFamily.bold,
    color: colors.brandStrong,
  },
  monthButton: {
    width: 34,
    height: 34,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPressed: { opacity: 0.75 },
  monthButtonText: {
    fontFamily: fontFamily.bold,
    color: colors.textPrimary,
    fontSize: 22,
    lineHeight: 24,
  },
  weekdayHeader: { flexDirection: 'row' },
  weekdayCell: { flex: 1, alignItems: 'center', paddingBottom: spacing.xs },
  weekdayLabel: { ...typography.micro, color: colors.textMuted, letterSpacing: 0 },
  grid: { flexDirection: 'column' },
  weekRow: { flexDirection: 'row' },
  cell: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 3,
  },
  cellPressed: { opacity: 0.7 },
  disc: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  discToday: { borderColor: colors.brand },
  discSelected: { backgroundColor: colors.brand },
  dateNumber: { fontFamily: fontFamily.semibold, color: colors.textPrimary, fontSize: 15 },
  dateMuted: { color: colors.textMuted, opacity: 0.6 },
  dateToday: { fontFamily: fontFamily.extrabold, color: colors.brandStrong },
  dateSelected: { fontFamily: fontFamily.extrabold, color: colors.accentInk },
  dateDisabled: { color: colors.textMuted, opacity: 0.35 },
});
