// PATCH endpoints for AI-derived rows on a project. Each call flips the
// `isEdited` flag on the server side so the UI can render an "EDITED" badge.

import { api } from './client';
import type {
  BudgetLineRecord,
  CharacterRecord,
  DepartmentKind,
  DepartmentRecord,
  SceneRecord,
} from './types';

export async function listCharacters(projectId: string): Promise<CharacterRecord[]> {
  const { data } = await api.get<CharacterRecord[]>(
    `/projects/${projectId}/characters`,
  );
  return data;
}

export async function patchCharacter(
  id: string,
  patch: Partial<{
    name: string;
    importance: 'LEAD' | 'SUPPORT' | 'DAY_ROLE';
    estimatedScreenTimeMinutes: number | null;
    estimatedShootDays: number | null;
    notes: string | null;
  }>,
): Promise<CharacterRecord> {
  const { data } = await api.patch<CharacterRecord>(`/characters/${id}`, patch);
  return data;
}

export async function listScenes(projectId: string): Promise<SceneRecord[]> {
  const { data } = await api.get<SceneRecord[]>(`/projects/${projectId}/scenes`);
  return data;
}

export async function patchScene(
  id: string,
  patch: Partial<{
    heading: string | null;
    synopsis: string | null;
    locationType: 'INTERIOR' | 'EXTERIOR' | 'INT_EXT';
    timeOfDay: 'DAY' | 'NIGHT' | 'DAWN' | 'DUSK' | 'UNSPECIFIED';
    locationName: string | null;
    estimatedPages: number | null;
    estimatedShootHours: number | null;
    hasStunts: boolean;
    hasVFX: boolean;
    hasSong: boolean;
  }>,
): Promise<SceneRecord> {
  const { data } = await api.patch<SceneRecord>(`/scenes/${id}`, patch);
  return data;
}

export async function listDepartments(projectId: string): Promise<DepartmentRecord[]> {
  const { data } = await api.get<DepartmentRecord[]>(
    `/projects/${projectId}/departments`,
  );
  return data;
}

export async function patchDepartment(
  id: string,
  patch: Partial<{ displayName: string; required: boolean }>,
): Promise<DepartmentRecord> {
  const { data } = await api.patch<DepartmentRecord>(`/departments/${id}`, patch);
  return data;
}

export async function listBudgetLines(projectId: string): Promise<BudgetLineRecord[]> {
  const { data } = await api.get<BudgetLineRecord[]>(
    `/projects/${projectId}/budget-lines`,
  );
  return data;
}

export async function patchBudgetLine(
  id: string,
  patch: Partial<{
    label: string;
    amountINR: number;
    department: DepartmentKind;
    notes: string | null;
  }>,
): Promise<BudgetLineRecord> {
  const { data } = await api.patch<BudgetLineRecord>(`/budget-lines/${id}`, patch);
  return data;
}

export async function createBudgetLine(
  projectId: string,
  body: {
    label: string;
    amountINR: number;
    department: DepartmentKind;
    notes?: string;
  },
): Promise<BudgetLineRecord> {
  const { data } = await api.post<BudgetLineRecord>(
    `/projects/${projectId}/budget-lines`,
    body,
  );
  return data;
}

export async function deleteBudgetLine(id: string): Promise<void> {
  await api.delete(`/budget-lines/${id}`);
}
