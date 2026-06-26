import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { StyleSheet, Text, View } from 'react-native';
import { FormErrorText } from '@/components/FormErrorText';
import { LabeledInput } from '@/components/LabeledInput';
import { PrimaryButton } from '@/components/PrimaryButton';
import { LanguagePicker } from '@/components/LanguagePicker';
import { FormSheetActions, FormSheetChrome } from '@/components/ui/FormSheet';
import { createProject, type CreateProjectInput } from '@/api/projects';
import { qk } from '@/api/queryKeys';
import { readApiError } from '@/api/client';
import { colors, shadows, spacing, typography } from '@/theme';
import { formatCurrencyINR, formatLanguages } from '@/lib/format';
import type { ProjectLanguage } from '@/api/types';

type Step = 0 | 1 | 2;

interface FormState {
  name: string;
  languages: ProjectLanguage[];
  genre: string;
  budgetMin: string;
  budgetMax: string;
}

const STEP_LABELS = ['Project', 'Budget', 'Confirm'];

export interface CreateProjectSheetProps {
  onClose: () => void;
  onCreated: (projectId: string) => void;
}

export function CreateProjectSheet({ onClose, onCreated }: CreateProjectSheetProps) {
  const qc = useQueryClient();

  const [step, setStep] = useState<Step>(0);
  const [form, setForm] = useState<FormState>({
    name: '',
    languages: [],
    genre: '',
    budgetMin: '',
    budgetMax: '',
  });
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (input: CreateProjectInput) => createProject(input),
    onSuccess: (project) => {
      void qc.invalidateQueries({ queryKey: qk.projects() });
      onCreated(project.id);
    },
  });

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleClose() {
    setError(null);
    if (step === 0) onClose();
    else setStep((step - 1) as Step);
  }

  function nextStep() {
    setError(null);
    if (step === 0) {
      if (!form.name.trim()) return setError('Give your project a working title.');
      if (form.languages.length === 0) return setError('Pick at least one language.');
      if (!form.genre.trim()) return setError('Add a one-word genre (e.g. "Action").');
      setStep(1);
    } else if (step === 1) {
      setStep(2);
    }
  }

  function previousStep() {
    setError(null);
    if (step === 0) onClose();
    else setStep((step - 1) as Step);
  }

  async function submit() {
    setError(null);
    try {
      const budgetMinINR = parseCrore(form.budgetMin);
      const budgetMaxINR = parseCrore(form.budgetMax);
      await mutation.mutateAsync({
        name: form.name.trim(),
        languages: form.languages,
        genre: form.genre.trim(),
        budgetMinINR: budgetMinINR ?? undefined,
        budgetMaxINR: budgetMaxINR ?? undefined,
      });
    } catch (err) {
      setError(readApiError(err, 'Could not create project'));
    }
  }

  return (
    <FormSheetChrome title="New project" onClose={handleClose}>
      <Stepper step={step} />

      {step === 0 ? (
        <View style={styles.form}>
          <Text style={styles.title}>Set up your film</Text>
          <Text style={styles.body}>Takes 2 minutes to set up. AI does everything for you.</Text>
          <LabeledInput
            label="Film Name"
            placeholder="e.g. Vajra"
            value={form.name}
            onChangeText={(v) => update('name', v)}
            autoCapitalize="words"
          />
          <View style={styles.spacer} />
          <LanguagePicker
            multiple
            value={form.languages}
            onChange={(v) => update('languages', v)}
            variant="dropdown"
            placeholder="Select a Language"
          />
          <View style={styles.spacer} />
          <LabeledInput
            label="Genre"
            placeholder="e.g. Action thriller"
            value={form.genre}
            onChangeText={(v) => update('genre', v)}
          />
        </View>
      ) : null}

      {step === 1 ? (
        <View style={styles.form}>
          <Text style={styles.title}>Budget range (optional)</Text>
          <Text style={styles.body}>
            In crore. We use this to calibrate the AI budget draft — but you can skip it and refine
            later.
          </Text>
          <LabeledInput
            label="Min budget (₹ crore)"
            placeholder="e.g. 12"
            keyboardType="decimal-pad"
            value={form.budgetMin}
            onChangeText={(v) => update('budgetMin', v)}
          />
          <LabeledInput
            label="Max budget (₹ crore)"
            placeholder="e.g. 18"
            keyboardType="decimal-pad"
            value={form.budgetMax}
            onChangeText={(v) => update('budgetMax', v)}
          />
        </View>
      ) : null}

      {step === 2 ? (
        <View style={styles.form}>
          <Text style={styles.title}>Confirm</Text>
          <Text style={styles.body}>One last look before we set up your workspace.</Text>
          <Summary label="Title" value={form.name} />
          <Summary
            label="Languages"
            value={form.languages.length > 0 ? formatLanguages(form.languages) : '—'}
          />
          <Summary label="Genre" value={form.genre} />
          <Summary
            label="Budget"
            value={
              form.budgetMin || form.budgetMax
                ? `${formatCurrencyINR(parseCrore(form.budgetMin))} – ${formatCurrencyINR(parseCrore(form.budgetMax))}`
                : 'Skipped'
            }
          />
          <Text style={[styles.body, { marginTop: spacing.lg }]}>
            After confirming, we'll take you straight to script upload. Your AI script analysis
            starts as soon as the file is uploaded.
          </Text>
        </View>
      ) : null}

      {error ? <FormErrorText>{error}</FormErrorText> : null}

      <FormSheetActions>
        <PrimaryButton
          title={step === 2 ? (mutation.isPending ? 'Creating…' : 'Create project') : 'Continue'}
          loading={mutation.isPending}
          onPress={step === 2 ? submit : nextStep}
        />
        <PrimaryButton
          title={step === 0 ? 'Cancel' : 'Back'}
          variant="ghost"
          onPress={previousStep}
        />
      </FormSheetActions>
    </FormSheetChrome>
  );
}

function Stepper({ step }: { step: Step }) {
  return (
    <View style={stepperStyles.wrap}>
      {STEP_LABELS.map((label, idx) => {
        const active = idx === step;
        const done = idx < step;
        return (
          <View key={label} style={stepperStyles.item}>
            <View
              style={[
                stepperStyles.dot,
                active && stepperStyles.dotActive,
                done && stepperStyles.dotDone,
              ]}
            >
              <Text style={[stepperStyles.dotText, active && stepperStyles.dotTextActive]}>
                {idx + 1}
              </Text>
            </View>
            <Text style={[stepperStyles.label, active && stepperStyles.labelActive]}>{label}</Text>
          </View>
        );
      })}
    </View>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

function parseCrore(input: string): number | null {
  if (!input.trim()) return null;
  const n = Number(input);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 10_000_000);
}

const styles = StyleSheet.create({
  form: { marginTop: spacing.lg },
  title: { ...typography.title, color: colors.textPrimary, marginBottom: spacing.sm },
  body: { ...typography.body, color: colors.textSecondary, marginBottom: spacing.lg },
  spacer: { height: spacing.lg },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  summaryLabel: { ...typography.caption, color: colors.textSecondary, textTransform: 'uppercase' },
  summaryValue: {
    ...typography.bodyStrong,
    color: colors.textPrimary,
    textAlign: 'right',
    flex: 1,
    marginLeft: spacing.md,
  },
});

const stepperStyles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  item: { alignItems: 'center', flex: 1 },
  dot: {
    width: 28,
    height: 28,
    borderRadius: 999,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  dotActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accentLight,
    ...shadows.accent,
  },
  dotDone: { backgroundColor: colors.accentSoft, borderColor: colors.accentMuted },
  dotText: { ...typography.bodyStrong, color: colors.textMuted },
  dotTextActive: { color: colors.accentInk },
  label: { ...typography.caption, color: colors.textMuted, marginTop: 4 },
  labelActive: { color: colors.textPrimary },
});
