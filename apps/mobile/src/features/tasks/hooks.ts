import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import {
  createTask,
  deleteTask,
  getProjectHealth,
  listTasks,
  updateTask,
  type CreateTaskInput,
  type UpdateTaskInput,
} from '@/api/workspace';
import { qk } from '@/api/queryKeys';
import type { TaskStatus } from '@/api/types';

function invalidateTaskCaches(qc: QueryClient, projectId: string): void {
  void qc.invalidateQueries({ queryKey: qk.tasksRoot(projectId) });
  void qc.invalidateQueries({ queryKey: qk.health(projectId) });
}

export function useProjectHealth(projectId: string) {
  return useQuery({
    queryKey: qk.health(projectId),
    queryFn: () => getProjectHealth(projectId),
    enabled: Boolean(projectId),
    staleTime: 10_000,
  });
}

export function useProjectTasks(projectId: string, departmentId?: string | null) {
  return useQuery({
    queryKey: qk.tasks(projectId, departmentId ?? 'all'),
    queryFn: () =>
      listTasks(projectId, departmentId ? { departmentId } : undefined),
    enabled: Boolean(projectId),
  });
}

export function useMoveTask(projectId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ taskId, status }: { taskId: string; status: TaskStatus }) =>
      updateTask(taskId, { status }),
    onSuccess: () => invalidateTaskCaches(qc, projectId),
  });
}

export function useCreateTask(projectId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateTaskInput) => createTask(projectId, input),
    onSuccess: () => invalidateTaskCaches(qc, projectId),
  });
}

export function useUpdateTask(projectId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ taskId, input }: { taskId: string; input: UpdateTaskInput }) =>
      updateTask(taskId, input),
    onSuccess: () => invalidateTaskCaches(qc, projectId),
  });
}

export function useDeleteTask(projectId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (taskId: string) => deleteTask(taskId),
    onSuccess: () => invalidateTaskCaches(qc, projectId),
  });
}
