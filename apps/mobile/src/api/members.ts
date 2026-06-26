import { api } from './client';
import type { ProjectInvite, ProjectMember, UserRole } from './types';

export async function listMembers(projectId: string): Promise<ProjectMember[]> {
  const { data } = await api.get<ProjectMember[]>(`/projects/${projectId}/members`);
  return data;
}

export interface InviteMemberInput {
  role: UserRole;
  name?: string;
  phone?: string;
  email?: string;
  projectDepartmentId?: string;
}

export async function inviteMember(
  projectId: string,
  input: InviteMemberInput,
): Promise<ProjectMember> {
  const { data } = await api.post<ProjectMember>(`/projects/${projectId}/members`, input);
  return data;
}

export async function acceptInvite(memberId: string): Promise<ProjectMember> {
  const { data } = await api.post<ProjectMember>(`/members/${memberId}/accept`);
  return data;
}

export async function removeMember(memberId: string): Promise<void> {
  await api.delete(`/members/${memberId}`);
}

export async function updateMemberSetStatus(
  projectId: string,
  memberId: string,
  input: { setStatus: import('./types').SetStatus; setStatusNote?: string },
): Promise<ProjectMember> {
  const { data } = await api.patch<ProjectMember>(
    `/projects/${projectId}/members/${memberId}/set-status`,
    input,
  );
  return data;
}

export async function listMyInvites(): Promise<ProjectInvite[]> {
  const { data } = await api.get<ProjectInvite[]>('/auth/me/invites');
  return data;
}
