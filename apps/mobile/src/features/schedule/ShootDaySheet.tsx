import { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { LabeledInput } from '@/components/LabeledInput';
import { DateField } from '@/components/DateField';
import { PrimaryButton } from '@/components/PrimaryButton';
import {
  FormSheet,
  FormSheetActions,
  FormSheetError,
  FormSheetFieldLabel,
  formSheetStyles,
} from '@/components/ui/FormSheet';
import { createShootDay, deleteShootDay, updateShootDay } from '@/api/workspace';
import { qk } from '@/api/queryKeys';
import { readApiError } from '@/api/client';
import { colors, radius, spacing, typography } from '@/theme';
import type { ShootDay, ShootTimeOfDay } from '@/api/types';

const NOTES_MAX = 2000;
const NOTES_MIN_HEIGHT = 88;
const NOTES_MAX_HEIGHT = 220;

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

const TIME_OPTIONS: { value: ShootTimeOfDay; label: string }[] = [
  { value: 'DAY', label: 'Day' },
  { value: 'NIGHT', label: 'Night' },
];

export interface ShootDaySheetProps {
  visible: boolean;
  onClose: () => void;
  projectId: string;
  existingDays: number[];
  /** When provided, the sheet edits this shoot day instead of creating one. */
  editing?: ShootDay | null;
}

export function ShootDaySheet({
  visible,
  onClose,
  projectId,
  existingDays,
  editing,
}: ShootDaySheetProps) {
  const qc = useQueryClient();
  const isEditing = Boolean(editing);

  const [dayNumber, setDayNumber] = useState('');
  const [date, setDate] = useState<Date | null>(null);
  const [location, setLocation] = useState('');
  const [timeOfDay, setTimeOfDay] = useState<ShootTimeOfDay | null>(null);
  const [personsRequired, setPersonsRequired] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Keep the latest existingDays without making it a reset trigger — the parent
  // recreates this array every render, which would otherwise wipe the form
  // (including a freshly picked date) on any background refetch.
  const existingDaysRef = useRef(existingDays);
  existingDaysRef.current = existingDays;

  // Reset the form only when the sheet opens or the edited day changes.
  // `editing` is stable parent state, so unrelated re-renders won't reset.
  useEffect(() => {
    if (!visible) return;
    if (editing) {
      setDayNumber(String(editing.dayNumber));
      setDate(new Date(editing.date));
      setLocation(editing.location ?? '');
      setTimeOfDay(editing.timeOfDay ?? null);
      setPersonsRequired(
        editing.personsRequired != null ? String(editing.personsRequired) : '',
      );
      setNotes(editing.notes ?? '');
    } else {
      const days = existingDaysRef.current;
      const next = days.length > 0 ? Math.max(...days) + 1 : 1;
      setDayNumber(String(next));
      setDate(null);
      setLocation('');
      setTimeOfDay(null);
      setPersonsRequired('');
      setNotes('');
    }
    setError(null);
  }, [visible, editing]);

  function invalidate() {
    void qc.invalidateQueries({ queryKey: qk.schedule(projectId) });
    void qc.invalidateQueries({ queryKey: qk.health(projectId) });
    void qc.invalidateQueries({ queryKey: qk.conflicts(projectId) });
  }

  const saveMutation = useMutation({
    mutationFn: () => {
      if (!date) throw new Error('Date is required');
      const persons = personsRequired.trim() ? Number(personsRequired) : null;
      if (editing) {
        return updateShootDay(editing.id, {
          date: date.toISOString(),
          location: location.trim() || null,
          timeOfDay: timeOfDay ?? null,
          personsRequired: persons,
          notes: notes.trim() || null,
        });
      }
      return createShootDay(projectId, {
        dayNumber: Number(dayNumber),
        date: date.toISOString(),
        location: location.trim() || undefined,
        timeOfDay: timeOfDay ?? undefined,
        personsRequired: persons ?? undefined,
        notes: notes.trim() || undefined,
      });
    },
    onSuccess: () => {
      invalidate();
      onClose();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => {
      if (!editing) throw new Error('Nothing to delete');
      return deleteShootDay(editing.id);
    },
    onSuccess: () => {
      invalidate();
      onClose();
    },
  });

  async function submit() {
    setError(null);
    if (!isEditing && (!dayNumber || Number.isNaN(Number(dayNumber)) || Number(dayNumber) < 1)) {
      setError('Pick a positive day number.');
      return;
    }
    if (!date) {
      setError('Pick a shoot date.');
      return;
    }
    if (personsRequired.trim() && (Number.isNaN(Number(personsRequired)) || Number(personsRequired) < 0)) {
      setError('Persons required must be a positive number.');
      return;
    }
    try {
      await saveMutation.mutateAsync();
    } catch (err) {
      setError(readApiError(err, 'Could not save shoot day'));
    }
  }

  function confirmDelete() {
    if (!editing) return;
    const dateLabel = new Date(editing.date).toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
    Alert.alert(
      'Delete shoot day?',
      `Day ${editing.dayNumber} (${dateLabel}) will be permanently removed. This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setError(null);
            deleteMutation.mutate(undefined, {
              onError: (err) => setError(readApiError(err, 'Could not delete shoot day')),
            });
          },
        },
      ],
    );
  }

  const busy = saveMutation.isPending || deleteMutation.isPending;

  // Past dates can't be scheduled. When editing a shoot day that's already in
  // the past, keep its existing date selectable so it still shows up.
  const todayStart = startOfDay(new Date());
  const minimumDate =
    editing && new Date(editing.date) < todayStart
      ? startOfDay(new Date(editing.date))
      : todayStart;

  return (
    <FormSheet
      visible={visible}
      title={isEditing ? `Edit Day ${editing?.dayNumber}` : 'New shoot day'}
      onClose={onClose}
    >
      {!isEditing ? (
        <LabeledInput
          label="Day number"
          placeholder="1"
          keyboardType="number-pad"
          value={dayNumber}
          onChangeText={setDayNumber}
        />
      ) : null}

      <DateField
        label="Date"
        value={date}
        onChange={setDate}
        placeholder="Tap to choose"
        minimumDate={minimumDate}
        hint="Past dates are disabled. Used by the conflict scanner to detect cross-project clashes."
      />

      <LabeledInput
        label="Location"
        placeholder="e.g. Annapurna Studios — Floor 2"
        value={location}
        onChangeText={setLocation}
      />

      <FormSheetFieldLabel>Time of day</FormSheetFieldLabel>
      <View style={formSheetStyles.chipRow}>
        {TIME_OPTIONS.map((opt) => {
          const active = timeOfDay === opt.value;
          return (
            <Pressable
              key={opt.value}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => setTimeOfDay(active ? null : opt.value)}
              style={[formSheetStyles.chip, active && formSheetStyles.chipActive]}
            >
              <Text style={[formSheetStyles.chipText, active && formSheetStyles.chipTextActive]}>
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <LabeledInput
        label="Persons required"
        placeholder="e.g. 25"
        keyboardType="number-pad"
        value={personsRequired}
        onChangeText={setPersonsRequired}
      />

      <NotesField value={notes} onChangeText={setNotes} />

      {error ? <FormSheetError>{error}</FormSheetError> : null}

      <FormSheetActions>
        <PrimaryButton
          title={isEditing ? 'Save changes' : 'Save shoot day'}
          loading={saveMutation.isPending}
          disabled={busy}
          onPress={submit}
        />
        {isEditing ? (
          <PrimaryButton
            title="Delete shoot day"
            variant="danger"
            loading={deleteMutation.isPending}
            disabled={busy}
            onPress={confirmDelete}
          />
        ) : null}
      </FormSheetActions>
    </FormSheet>
  );
}

/** Auto-growing notes textarea with a live character counter. */
function NotesField({
  value,
  onChangeText,
}: {
  value: string;
  onChangeText: (text: string) => void;
}) {
  const [focused, setFocused] = useState(false);
  const [height, setHeight] = useState(NOTES_MIN_HEIGHT);
  const atLimit = value.length >= NOTES_MAX;

  return (
    <View>
      <FormSheetFieldLabel>Notes</FormSheetFieldLabel>
      <View style={[notesStyles.box, focused && notesStyles.boxFocused]}>
        <TextInput
          style={[notesStyles.input, { height }]}
          value={value}
          onChangeText={(text) => onChangeText(text.slice(0, NOTES_MAX))}
          placeholder="Optional context for the production team"
          placeholderTextColor={colors.textMuted}
          selectionColor={colors.brand}
          multiline
          textAlignVertical="top"
          maxLength={NOTES_MAX}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onContentSizeChange={(e) => {
            const next = Math.min(
              NOTES_MAX_HEIGHT,
              Math.max(NOTES_MIN_HEIGHT, e.nativeEvent.contentSize.height),
            );
            setHeight(next);
          }}
        />
      </View>
      <Text style={[notesStyles.counter, atLimit && notesStyles.counterLimit]}>
        {value.length}/{NOTES_MAX}
      </Text>
    </View>
  );
}

const notesStyles = StyleSheet.create({
  box: {
    backgroundColor: colors.surfaceGlass,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  boxFocused: { borderColor: colors.brand, backgroundColor: colors.surface },
  input: { ...typography.body, color: colors.textPrimary, padding: 0 },
  counter: {
    ...typography.caption,
    color: colors.textMuted,
    alignSelf: 'flex-end',
    marginTop: spacing.xs,
  },
  counterLimit: { color: colors.danger },
});
