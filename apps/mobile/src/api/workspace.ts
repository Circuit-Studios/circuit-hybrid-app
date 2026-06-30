import { api } from './client';
import type {
  ConflictAlert,
  ProjectHealth,
  ShootDay,
  ShootTimeOfDay,
  Task,
  TaskPriority,
  TaskStatus,
} from './types';

export async function getProjectHealth(projectId: string): Promise<ProjectHealth> {
  const { data } = await api.get<ProjectHealth>(`/projects/${projectId}/health`);
  return data;
}

export interface ListTasksParams {
  status?: TaskStatus;
  departmentId?: string;
  assigneeUserId?: string;
}

export async function listTasks(projectId: string, params: ListTasksParams = {}): Promise<Task[]> {
  const { data } = await api.get<Task[]>(`/projects/${projectId}/tasks`, { params });
  return data;
}

export interface CreateTaskInput {
  departmentId: string;
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: string;
  assigneeUserId?: string;
  characterId?: string;
  sceneId?: string;
  shootDayId?: string;
}

export async function createTask(projectId: string, input: CreateTaskInput): Promise<Task> {
  const { data } = await api.post<Task>(`/projects/${projectId}/tasks`, input);
  return data;
}

export interface UpdateTaskInput extends Partial<CreateTaskInput> {
  status?: TaskStatus;
}

export async function updateTask(taskId: string, input: UpdateTaskInput): Promise<Task> {
  const { data } = await api.patch<Task>(`/tasks/${taskId}`, input);
  return data;
}

export async function deleteTask(taskId: string): Promise<void> {
  await api.delete(`/tasks/${taskId}`);
}

export async function listShootDays(
  projectId: string,
  range?: { from?: string; to?: string },
): Promise<ShootDay[]> {
  const { data } = await api.get<ShootDay[]>(`/projects/${projectId}/schedule`, {
    params: range,
  });
  return data;
}

export interface CreateShootDayInput {
  dayNumber: number;
  date: string;
  location?: string;
  timeOfDay?: ShootTimeOfDay;
  personsRequired?: number;
  notes?: string;
  callTimeUserId?: string;
  sceneIds?: string[];
}

export async function createShootDay(
  projectId: string,
  input: CreateShootDayInput,
): Promise<ShootDay> {
  const { data } = await api.post<ShootDay>(`/projects/${projectId}/shoot-days`, input);
  return data;
}

export interface UpdateShootDayInput {
  date?: string;
  location?: string | null;
  timeOfDay?: ShootTimeOfDay | null;
  personsRequired?: number | null;
  notes?: string | null;
  callTimeUserId?: string | null;
  sceneIds?: string[];
}

export async function updateShootDay(
  shootDayId: string,
  input: UpdateShootDayInput,
): Promise<ShootDay> {
  const { data } = await api.patch<ShootDay>(`/shoot-days/${shootDayId}`, input);
  return data;
}

export async function deleteShootDay(shootDayId: string): Promise<void> {
  await api.delete(`/shoot-days/${shootDayId}`);
}

export async function listConflicts(
  projectId: string,
  includeResolved = false,
): Promise<ConflictAlert[]> {
  const { data } = await api.get<ConflictAlert[]>(`/projects/${projectId}/conflicts`, {
    params: { includeResolved: includeResolved ? 'true' : undefined },
  });
  return data;
}
