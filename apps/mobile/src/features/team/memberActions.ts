import type { ProjectMember } from '@/api/types';

/** UI gate for destructive team actions — wire to project permissions later. */
export function canRemoveMember(_member: ProjectMember): boolean {
  return true;
}

export function memberRemoveLabel(member: ProjectMember): string {
  return member.status === 'INVITED' ? 'Cancel invite' : 'Remove';
}
