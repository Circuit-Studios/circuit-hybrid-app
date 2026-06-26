import { api } from './client';

export type TaskSuggestionStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CONVERTED';

export interface TaskSuggestionRecord {
  id: string;
  projectId: string;
  scriptId?: string | null;
  shootingPlanId?: string | null;
  title: string;
  description?: string | null;
  departmentKind: string;
  priority: string;
  sceneNumbers: string[];
  characterNames: string[];
  estimatedDueOffsetDays?: number | null;
  status: TaskSuggestionStatus;
  convertedTaskId?: string | null;
}

export interface ShootingPlanRecord {
  id: string;
  projectId: string;
  scriptId: string;
  summary: string;
  totalShootDays: number;
  risks: string[];
  plan: {
    summary?: string;
    totalShootDays?: number;
    risks?: string[];
    days?: Array<{
      dayNumber: number;
      title: string;
      sceneNumbers: string[];
      location?: string | null;
      notes?: string | null;
      estimatedHours?: number | null;
    }>;
    optimizationNotes?: string[];
  };
}

export async function getShootingPlan(
  projectId: string,
  scriptId?: string,
): Promise<{ plan: ShootingPlanRecord }> {
  const { data } = await api.get<{ plan: ShootingPlanRecord }>(
    `/projects/${projectId}/shooting-plan`,
    { params: scriptId ? { scriptId } : undefined },
  );
  return data;
}

export async function listTaskSuggestions(
  projectId: string,
  status?: TaskSuggestionStatus,
): Promise<{ suggestions: TaskSuggestionRecord[] }> {
  const { data } = await api.get<{ suggestions: TaskSuggestionRecord[] }>(
    `/projects/${projectId}/task-suggestions`,
    { params: status ? { status } : undefined },
  );
  return data;
}

export async function approveTaskSuggestion(id: string): Promise<void> {
  await api.post(`/task-suggestions/${id}/approve`);
}

export async function rejectTaskSuggestion(id: string): Promise<void> {
  await api.post(`/task-suggestions/${id}/reject`);
}

export async function bulkApproveTaskSuggestions(projectId: string, ids: string[]): Promise<void> {
  await api.post('/task-suggestions/bulk-approve', { projectId, ids });
}
