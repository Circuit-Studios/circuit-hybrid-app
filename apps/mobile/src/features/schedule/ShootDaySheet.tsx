import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { LabeledInput } from '@/components/LabeledInput';
import { DateField } from '@/components/DateField';
import { PrimaryButton } from '@/components/PrimaryButton';
import { FormSheet, FormSheetActions, FormSheetError } from '@/components/ui/FormSheet';
import { createShootDay } from '@/api/workspace';
import { qk } from '@/api/queryKeys';
import { readApiError } from '@/api/client';

export interface ShootDaySheetProps {
  visible: boolean;
  onClose: () => void;
  projectId: string;
  existingDays: number[];
}

export function ShootDaySheet({ visible, onClose, projectId, existingDays }: ShootDaySheetProps) {
  const qc = useQueryClient();
  const [dayNumber, setDayNumber] = useState('');
  const [date, setDate] = useState<Date | null>(null);
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    const next = existingDays.length > 0 ? Math.max(...existingDays) + 1 : 1;
    setDayNumber(String(next));
    setDate(null);
    setLocation('');
    setNotes('');
    setError(null);
  }, [visible, existingDays]);

  const mutation = useMutation({
    mutationFn: () => {
      if (!date) throw new Error('Date is required');
      return createShootDay(projectId, {
        dayNumber: Number(dayNumber),
        date: date.toISOString(),
        location: location.trim() || undefined,
        notes: notes.trim() || undefined,
      });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.schedule(projectId) });
      void qc.invalidateQueries({ queryKey: qk.health(projectId) });
      void qc.invalidateQueries({ queryKey: qk.conflicts(projectId) });
      onClose();
    },
  });

  async function submit() {
    setError(null);
    if (!dayNumber || Number.isNaN(Number(dayNumber)) || Number(dayNumber) < 1) {
      setError('Pick a positive day number.');
      return;
    }
    if (!date) {
      setError('Pick a shoot date.');
      return;
    }
    try {
      await mutation.mutateAsync();
    } catch (err) {
      setError(readApiError(err, 'Could not save shoot day'));
    }
  }

  return (
    <FormSheet visible={visible} title="New shoot day" onClose={onClose}>
      <LabeledInput
        label="Day number"
        placeholder="1"
        keyboardType="number-pad"
        value={dayNumber}
        onChangeText={setDayNumber}
      />
      <DateField
        label="Date"
        value={date}
        onChange={setDate}
        placeholder="Tap to choose"
        hint="Used by the conflict scanner to detect cross-project clashes."
      />
      <LabeledInput
        label="Location"
        placeholder="e.g. Annapurna Studios — Floor 2"
        value={location}
        onChangeText={setLocation}
      />
      <LabeledInput
        label="Notes"
        placeholder="Optional context for the production team"
        value={notes}
        onChangeText={setNotes}
        multiline
        numberOfLines={3}
      />

      {error ? <FormSheetError>{error}</FormSheetError> : null}

      <FormSheetActions>
        <PrimaryButton title="Save shoot day" loading={mutation.isPending} onPress={submit} />
      </FormSheetActions>
    </FormSheet>
  );
}
