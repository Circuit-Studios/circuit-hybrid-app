import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { LabeledInput } from '@/components/LabeledInput';
import { PrimaryButton } from '@/components/PrimaryButton';
import {
  FormSheet,
  FormSheetActions,
  FormSheetError,
  FormSheetFieldLabel,
  formSheetStyles,
} from '@/components/ui/FormSheet';
import { readApiError } from '@/api/client';
import { useCreateTask, useDeleteTask, useUpdateTask } from '@/features/tasks/hooks';
import { formatStatus } from '@/lib/format';
import type { DepartmentSummary, Task, TaskPriority, TaskStatus } from '@/api/types';

const TASK_STATUSES: { id: TaskStatus; label: string }[] = [
  { id: 'TODO', label: 'To do' },
  { id: 'IN_PROGRESS', label: 'In progress' },
  { id: 'BLOCKED', label: 'Blocked' },
  { id: 'DONE', label: 'Done' },
];

const PRIORITIES: TaskPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

export interface TaskSheetProps {
  visible: boolean;
  onClose: () => void;
  projectId: string;
  departments: DepartmentSummary[];
  editing: Task | null;
  defaultDepartmentId: string | null;
}

export function TaskSheet({
  visible,
  onClose,
  projectId,
  departments,
  editing,
  defaultDepartmentId,
}: TaskSheetProps) {
  const createTask = useCreateTask(projectId);
  const updateTaskMutation = useUpdateTask(projectId);
  const deleteTaskMutation = useDeleteTask(projectId);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [departmentId, setDepartmentId] = useState<string | null>(null);
  const [priority, setPriority] = useState<TaskPriority>('MEDIUM');
  const [status, setStatus] = useState<TaskStatus>('TODO');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    if (editing) {
      setTitle(editing.title);
      setDescription(editing.description ?? '');
      setDepartmentId(editing.departmentId);
      setPriority(editing.priority);
      setStatus(editing.status);
    } else {
      setTitle('');
      setDescription('');
      setDepartmentId(defaultDepartmentId ?? departments[0]?.id ?? null);
      setPriority('MEDIUM');
      setStatus('TODO');
    }
    setError(null);
  }, [visible, editing, defaultDepartmentId, departments]);

  async function submit() {
    setError(null);
    if (!title.trim()) {
      setError('Give the task a title.');
      return;
    }
    if (!departmentId) {
      setError('Pick a department.');
      return;
    }
    try {
      if (editing) {
        await updateTaskMutation.mutateAsync({
          taskId: editing.id,
          input: {
            title,
            description: description || undefined,
            priority,
            status,
            departmentId: departmentId ?? undefined,
          },
        });
      } else {
        await createTask.mutateAsync({
          departmentId: departmentId!,
          title,
          description: description || undefined,
          status,
          priority,
        });
      }
      onClose();
    } catch (err) {
      setError(readApiError(err, 'Could not save task'));
    }
  }

  async function destroy() {
    if (!editing) return;
    try {
      await deleteTaskMutation.mutateAsync(editing.id);
      onClose();
    } catch (err) {
      setError(readApiError(err, 'Could not delete'));
    }
  }

  return (
    <FormSheet visible={visible} title={editing ? 'Edit task' : 'New task'} onClose={onClose}>
      <LabeledInput
        label="Title"
        placeholder="e.g. Lock costume for hero (Act 2)"
        value={title}
        onChangeText={setTitle}
      />
      <LabeledInput
        label="Notes"
        placeholder="Optional context for the assignee"
        value={description}
        onChangeText={setDescription}
        multiline
        numberOfLines={4}
      />

      <FormSheetFieldLabel>Department</FormSheetFieldLabel>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={formSheetStyles.chipRow}
      >
        {departments.map(d => (
          <Pressable
            key={d.id}
            onPress={() => setDepartmentId(d.id)}
            style={[formSheetStyles.chip, departmentId === d.id && formSheetStyles.chipActive]}
          >
            <Text
              style={[
                formSheetStyles.chipText,
                departmentId === d.id && formSheetStyles.chipTextActive,
              ]}
            >
              {d.displayName}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <FormSheetFieldLabel>Priority</FormSheetFieldLabel>
      <View style={formSheetStyles.chipRow}>
        {PRIORITIES.map(p => (
          <Pressable
            key={p}
            onPress={() => setPriority(p)}
            style={[formSheetStyles.chip, priority === p && formSheetStyles.chipActive]}
          >
            <Text
              style={[formSheetStyles.chipText, priority === p && formSheetStyles.chipTextActive]}
            >
              {p}
            </Text>
          </Pressable>
        ))}
      </View>

      <FormSheetFieldLabel>Status</FormSheetFieldLabel>
      <View style={formSheetStyles.chipRow}>
        {TASK_STATUSES.map(s => (
          <Pressable
            key={s.id}
            onPress={() => setStatus(s.id)}
            style={[formSheetStyles.chip, status === s.id && formSheetStyles.chipActive]}
          >
            <Text
              style={[formSheetStyles.chipText, status === s.id && formSheetStyles.chipTextActive]}
            >
              {formatStatus(s.id)}
            </Text>
          </Pressable>
        ))}
      </View>

      {error ? <FormSheetError>{error}</FormSheetError> : null}

      <FormSheetActions>
        <PrimaryButton
          title={editing ? 'Save changes' : 'Create task'}
          loading={createTask.isPending || updateTaskMutation.isPending}
          onPress={submit}
        />
        {editing ? (
          <PrimaryButton
            title="Delete task"
            variant="danger"
            loading={deleteTaskMutation.isPending}
            onPress={destroy}
          />
        ) : null}
      </FormSheetActions>
    </FormSheet>
  );
}
