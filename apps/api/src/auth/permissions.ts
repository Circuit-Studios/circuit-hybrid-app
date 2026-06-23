import type { NextFunction, Request, Response } from 'express';
import { UserRole } from '@prisma/client';
import { forbidden, unauthorized } from '../lib/http.js';
import { prisma } from '../lib/prisma.js';

export type Permission =
  | 'tasks.create'
  | 'tasks.update'
  | 'tasks.delete'
  | 'tasks.updateStatus'
  | 'scripts.upload'
  | 'scripts.aiAnalysis'
  | 'team.invites';

const MANAGER_ROLES: UserRole[] = [
  UserRole.DIRECTOR,
  UserRole.PRODUCER,
  UserRole.EXECUTIVE_PRODUCER,
  UserRole.LINE_PRODUCER,
  UserRole.AD,
  UserRole.DEPT_HEAD,
];

const SCRIPT_EDITOR_ROLES: UserRole[] = [
  UserRole.DIRECTOR,
  UserRole.PRODUCER,
  UserRole.EXECUTIVE_PRODUCER,
  UserRole.LINE_PRODUCER,
];

const INVITER_ROLES: UserRole[] = [
  UserRole.DIRECTOR,
  UserRole.PRODUCER,
  UserRole.EXECUTIVE_PRODUCER,
  UserRole.LINE_PRODUCER,
];

export const rolePermissions: Record<UserRole, Permission[]> = {
  [UserRole.DIRECTOR]: [
    'tasks.create',
    'tasks.update',
    'tasks.delete',
    'tasks.updateStatus',
    'scripts.upload',
    'scripts.aiAnalysis',
    'team.invites',
  ],
  [UserRole.PRODUCER]: [
    'tasks.create',
    'tasks.update',
    'tasks.delete',
    'tasks.updateStatus',
    'scripts.upload',
    'scripts.aiAnalysis',
    'team.invites',
  ],
  [UserRole.EXECUTIVE_PRODUCER]: [
    'tasks.create',
    'tasks.update',
    'tasks.delete',
    'tasks.updateStatus',
    'scripts.upload',
    'scripts.aiAnalysis',
    'team.invites',
  ],
  [UserRole.LINE_PRODUCER]: [
    'tasks.create',
    'tasks.update',
    'tasks.delete',
    'tasks.updateStatus',
    'scripts.upload',
    'scripts.aiAnalysis',
    'team.invites',
  ],
  [UserRole.AD]: ['tasks.create', 'tasks.update', 'tasks.delete', 'tasks.updateStatus'],
  [UserRole.DEPT_HEAD]: ['tasks.create', 'tasks.update', 'tasks.delete', 'tasks.updateStatus'],
  [UserRole.DOP]: ['tasks.updateStatus'],
  [UserRole.CREW]: ['tasks.updateStatus'],
  [UserRole.ACTOR]: ['tasks.updateStatus'],
  [UserRole.VENDOR]: ['tasks.updateStatus'],
};

export function can(role: UserRole, permission: Permission): boolean {
  return rolePermissions[role]?.includes(permission) ?? false;
}

export function isTaskManager(role: UserRole): boolean {
  return MANAGER_ROLES.includes(role);
}

export function canInviteMembers(role: UserRole): boolean {
  return INVITER_ROLES.includes(role);
}

export function canEditScripts(role: UserRole): boolean {
  return SCRIPT_EDITOR_ROLES.includes(role);
}

export interface ProjectMembershipContext {
  id: string;
  role: UserRole;
  projectDepartmentId: string | null;
}

export async function getActiveMembership(
  userId: string,
  projectId: string,
): Promise<ProjectMembershipContext | null> {
  return prisma.projectMember.findFirst({
    where: { projectId, userId, status: 'ACTIVE' },
    select: { id: true, role: true, projectDepartmentId: true },
  });
}

export function assertDeptHeadDepartmentScope(
  membership: ProjectMembershipContext,
  departmentId: string,
): void {
  if (membership.role !== UserRole.DEPT_HEAD) return;
  if (membership.projectDepartmentId !== departmentId) {
    throw forbidden('Department heads can only manage their own department');
  }
}

export function requirePermission(permission: Permission) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(unauthorized());

    const projectId = req.params.projectId;
    if (!projectId) {
      return next(forbidden('Missing projectId for permission check'));
    }

    const membership = await getActiveMembership(req.user.sub, projectId);
    if (!membership) {
      return next(forbidden('You are not a member of this project'));
    }
    if (!can(membership.role, permission)) {
      return next(forbidden(`Role ${membership.role} cannot perform this action`));
    }

    req.projectMembership = membership;
    next();
  };
}
