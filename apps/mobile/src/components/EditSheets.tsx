// Bottom-sheet edit forms for AI-derived rows.
//
// Each sheet:
//   - Takes the canonical record (with id) + an `onClose` callback
//   - Maintains local form state
//   - Calls the matching PATCH endpoint
//   - Invalidates relevant React Query caches on success
//
// All sheets share `BaseSheet` for the modal chrome + dismiss behavior.

import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { PrimaryButton } from '@/components/PrimaryButton';
import { LabeledInput } from '@/components/LabeledInput';
import { StatusBadge } from '@/components/StatusBadge';
import { patchBudgetLine, patchCharacter, patchDepartment, patchScene } from '@/api/edits';
import { readApiError } from '@/api/client';
import { qk } from '@/api/queryKeys';
import { colors, radius, spacing, typography } from '@/theme';
import type { BudgetLineRecord, CharacterRecord, DepartmentRecord, SceneRecord } from '@/api/types';

// ============================================================
// Base sheet
// ============================================================

interface BaseSheetProps {
  visible: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
}

function BaseSheet({ visible, title, subtitle, onClose, children }: BaseSheetProps) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={styles.backdropPressable} onPress={onClose} />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.sheet}
        >
          <View style={styles.handle} />
          <View style={styles.head}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{title}</Text>
              {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
            </View>
            <Pressable onPress={onClose} hitSlop={12}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </Pressable>
          </View>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

// ============================================================
// Character edit sheet
// ============================================================

const IMPORTANCE_OPTIONS = ['LEAD', 'SUPPORT', 'DAY_ROLE'] as const;

export function CharacterEditSheet({
  character,
  onClose,
}: {
  character: CharacterRecord | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [name, setName] = useState(character?.name ?? '');
  const [importance, setImportance] = useState<CharacterRecord['importance']>(
    character?.importance ?? 'SUPPORT',
  );
  const [screenTime, setScreenTime] = useState(
    character?.estimatedScreenTimeMinutes != null
      ? String(character.estimatedScreenTimeMinutes)
      : '',
  );
  const [notes, setNotes] = useState(character?.notes ?? '');

  const mutation = useMutation({
    mutationFn: () =>
      patchCharacter(character!.id, {
        name: name.trim(),
        importance,
        estimatedScreenTimeMinutes: screenTime.trim() ? Number(screenTime) : null,
        notes: notes.trim() || null,
      }),
    onSuccess: () => {
      if (character) {
        void qc.invalidateQueries({ queryKey: qk.characters(character.projectId) });
      }
      void qc.invalidateQueries({ queryKey: qk.analysisRoot() });
      onClose();
    },
  });

  return (
    <BaseSheet
      visible={!!character}
      title="Edit character"
      subtitle={
        character?.isEdited
          ? 'Previously edited — your override stays'
          : 'Override the AI extraction'
      }
      onClose={onClose}
    >
      <LabeledInput
        label="Name"
        value={name}
        onChangeText={setName}
        autoCapitalize="words"
        maxLength={120}
      />
      <Text style={styles.fieldLabel}>Importance</Text>
      <View style={styles.optionRow}>
        {IMPORTANCE_OPTIONS.map(opt => (
          <Pressable
            key={opt}
            onPress={() => setImportance(opt)}
            style={[styles.optionChip, importance === opt && styles.optionChipActive]}
          >
            <Text
              style={[styles.optionChipText, importance === opt && styles.optionChipTextActive]}
            >
              {opt.replace('_', ' ')}
            </Text>
          </Pressable>
        ))}
      </View>
      <LabeledInput
        label="Screen time (minutes)"
        value={screenTime}
        onChangeText={setScreenTime}
        keyboardType="number-pad"
        hint="Optional. Leave blank if unknown."
      />
      <LabeledInput
        label="Notes"
        value={notes}
        onChangeText={setNotes}
        multiline
        numberOfLines={3}
      />
      {mutation.error ? <Text style={styles.error}>{readApiError(mutation.error)}</Text> : null}
      <PrimaryButton
        title="Save"
        onPress={() => mutation.mutate()}
        loading={mutation.isPending}
        disabled={!name.trim()}
      />
    </BaseSheet>
  );
}

// ============================================================
// Scene edit sheet
// ============================================================

const LOCATION_TYPES = ['INTERIOR', 'EXTERIOR', 'INT_EXT'] as const;
const TIMES_OF_DAY = ['DAY', 'NIGHT', 'DAWN', 'DUSK', 'UNSPECIFIED'] as const;

export function SceneEditSheet({
  scene,
  onClose,
}: {
  scene: SceneRecord | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [synopsis, setSynopsis] = useState(scene?.synopsis ?? '');
  const [locationName, setLocationName] = useState(scene?.locationName ?? '');
  const [locationType, setLocationType] = useState(scene?.locationType ?? 'INTERIOR');
  const [timeOfDay, setTimeOfDay] = useState(scene?.timeOfDay ?? 'UNSPECIFIED');
  const [hasStunts, setHasStunts] = useState(scene?.hasStunts ?? false);
  const [hasVFX, setHasVFX] = useState(scene?.hasVFX ?? false);
  const [hasSong, setHasSong] = useState(scene?.hasSong ?? false);

  const mutation = useMutation({
    mutationFn: () =>
      patchScene(scene!.id, {
        synopsis: synopsis.trim() || null,
        locationName: locationName.trim() || null,
        locationType,
        timeOfDay,
        hasStunts,
        hasVFX,
        hasSong,
      }),
    onSuccess: () => {
      if (scene) {
        void qc.invalidateQueries({ queryKey: qk.scenes(scene.projectId) });
      }
      void qc.invalidateQueries({ queryKey: qk.analysisRoot() });
      onClose();
    },
  });

  return (
    <BaseSheet
      visible={!!scene}
      title={scene ? `Edit scene ${scene.sceneNumber}` : 'Edit scene'}
      subtitle={scene?.heading ?? undefined}
      onClose={onClose}
    >
      <LabeledInput
        label="Synopsis"
        value={synopsis}
        onChangeText={setSynopsis}
        multiline
        numberOfLines={3}
      />
      <LabeledInput
        label="Location name"
        value={locationName}
        onChangeText={setLocationName}
        maxLength={160}
      />
      <Text style={styles.fieldLabel}>Location type</Text>
      <View style={styles.optionRow}>
        {LOCATION_TYPES.map(opt => (
          <Pressable
            key={opt}
            onPress={() => setLocationType(opt)}
            style={[styles.optionChip, locationType === opt && styles.optionChipActive]}
          >
            <Text
              style={[styles.optionChipText, locationType === opt && styles.optionChipTextActive]}
            >
              {opt === 'INT_EXT' ? 'INT/EXT' : opt}
            </Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.fieldLabel}>Time of day</Text>
      <View style={styles.optionRow}>
        {TIMES_OF_DAY.map(opt => (
          <Pressable
            key={opt}
            onPress={() => setTimeOfDay(opt)}
            style={[styles.optionChip, timeOfDay === opt && styles.optionChipActive]}
          >
            <Text style={[styles.optionChipText, timeOfDay === opt && styles.optionChipTextActive]}>
              {opt}
            </Text>
          </Pressable>
        ))}
      </View>
      <FlagRow label="Has stunts" value={hasStunts} onValueChange={setHasStunts} />
      <FlagRow label="Has VFX" value={hasVFX} onValueChange={setHasVFX} />
      <FlagRow label="Has song" value={hasSong} onValueChange={setHasSong} />
      {mutation.error ? <Text style={styles.error}>{readApiError(mutation.error)}</Text> : null}
      <PrimaryButton title="Save" onPress={() => mutation.mutate()} loading={mutation.isPending} />
    </BaseSheet>
  );
}

// ============================================================
// Department edit sheet
// ============================================================

export function DepartmentEditSheet({
  department,
  onClose,
}: {
  department: DepartmentRecord | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [displayName, setDisplayName] = useState(department?.displayName ?? '');
  const [required, setRequired] = useState(department?.required ?? true);

  const mutation = useMutation({
    mutationFn: () =>
      patchDepartment(department!.id, {
        displayName: displayName.trim(),
        required,
      }),
    onSuccess: () => {
      if (department) {
        void qc.invalidateQueries({ queryKey: qk.departments(department.projectId) });
        void qc.invalidateQueries({ queryKey: qk.health(department.projectId) });
      }
      onClose();
    },
  });

  return (
    <BaseSheet
      visible={!!department}
      title="Edit department"
      subtitle={department ? department.kind.replace(/_/g, ' ') : undefined}
      onClose={onClose}
    >
      <LabeledInput
        label="Display name"
        value={displayName}
        onChangeText={setDisplayName}
        maxLength={80}
      />
      <FlagRow label="Required for this project" value={required} onValueChange={setRequired} />
      <Text style={styles.fieldHint}>
        Unticking suppresses the "{department?.displayName ?? 'department'} is behind" alert engine
        for this project.
      </Text>
      {mutation.error ? <Text style={styles.error}>{readApiError(mutation.error)}</Text> : null}
      <PrimaryButton
        title="Save"
        onPress={() => mutation.mutate()}
        loading={mutation.isPending}
        disabled={!displayName.trim()}
      />
    </BaseSheet>
  );
}

// ============================================================
// Budget line edit sheet
// ============================================================

export function BudgetLineEditSheet({
  line,
  onClose,
}: {
  line: BudgetLineRecord | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [label, setLabel] = useState(line?.label ?? '');
  // amount stored as string for input UX; converted on submit.
  const [amount, setAmount] = useState(line ? line.amountINR : '');
  const [notes, setNotes] = useState(line?.notes ?? '');

  const mutation = useMutation({
    mutationFn: () =>
      patchBudgetLine(line!.id, {
        label: label.trim(),
        amountINR: Number(amount.replace(/[^\d]/g, '')) || 0,
        notes: notes.trim() || null,
      }),
    onSuccess: () => {
      if (line) {
        void qc.invalidateQueries({ queryKey: qk.budgetLines(line.projectId) });
      }
      void qc.invalidateQueries({ queryKey: qk.analysisRoot() });
      onClose();
    },
  });

  return (
    <BaseSheet
      visible={!!line}
      title="Edit budget line"
      subtitle={line ? line.department.replace(/_/g, ' ') : undefined}
      onClose={onClose}
    >
      <LabeledInput label="Label" value={label} onChangeText={setLabel} maxLength={200} />
      <LabeledInput
        label="Amount (INR)"
        value={amount}
        onChangeText={setAmount}
        keyboardType="number-pad"
        hint="Whole rupees. No commas."
      />
      <LabeledInput
        label="Notes"
        value={notes}
        onChangeText={setNotes}
        multiline
        numberOfLines={3}
      />
      {line?.isAIDraft ? (
        <View style={styles.aiDraftBadge}>
          <StatusBadge label="AI DRAFT" tone="info" />
          <Text style={styles.fieldHint}>Saving converts this row to a human-confirmed line.</Text>
        </View>
      ) : null}
      {mutation.error ? <Text style={styles.error}>{readApiError(mutation.error)}</Text> : null}
      <PrimaryButton
        title="Save"
        onPress={() => mutation.mutate()}
        loading={mutation.isPending}
        disabled={!label.trim() || !amount.trim()}
      />
    </BaseSheet>
  );
}

// ============================================================
// Shared sub-components
// ============================================================

function FlagRow({
  label,
  value,
  onValueChange,
}: {
  label: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
}) {
  return (
    <View style={styles.flagRow}>
      <Text style={styles.flagLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ true: colors.accent, false: colors.border }}
        thumbColor={value ? colors.accentInk : colors.textMuted}
      />
    </View>
  );
}

// ============================================================
// Styles
// ============================================================

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.55)' },
  backdropPressable: { ...StyleSheet.absoluteFill },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: '85%',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  title: { ...typography.title, color: colors.textPrimary },
  subtitle: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  scroll: { flexGrow: 0 },
  scrollContent: { paddingBottom: spacing.lg },
  fieldLabel: {
    ...typography.bodyStrong,
    color: colors.textSecondary,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  fieldHint: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  optionChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
  },
  optionChipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  optionChipText: { ...typography.caption, color: colors.textSecondary },
  optionChipTextActive: { color: colors.accentInk, fontWeight: '700' },
  flagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  flagLabel: { ...typography.body, color: colors.textPrimary },
  error: { ...typography.caption, color: colors.danger, marginBottom: spacing.md },
  aiDraftBadge: { marginBottom: spacing.sm, gap: spacing.xs },
});

// Silence unused warnings from imports that the linter may flag in isolation.
void TextInput;
