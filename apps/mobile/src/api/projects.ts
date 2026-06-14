import { api } from './client';
import type { Project, ProjectLanguage } from './types';

export interface CreateProjectInput {
  name: string;
  languages: ProjectLanguage[];
  genre: string;
  budgetMinINR?: number;
  budgetMaxINR?: number;
  shootStartDate?: string;
  shootEndDate?: string;
}

export async function listProjects(): Promise<Project[]> {
  const { data } = await api.get<Project[]>('/projects');
  return data;
}

export async function getProject(projectId: string): Promise<Project> {
  const { data } = await api.get<Project>(`/projects/${projectId}`);
  return data;
}

export async function createProject(input: CreateProjectInput): Promise<Project> {
  const { data } = await api.post<Project>('/projects', input);
  return data;
}
