import {
  DepartmentKind,
  MembershipStatus,
  ProjectLanguage,
  TaskPriority,
  TaskStatus,
  UserRole,
} from '@prisma/client';
import { prisma } from '../../src/lib/prisma.js';
import { signJwt } from '../../src/lib/jwt.js';

let seq = 0;
const uniq = () => `${Date.now()}-${seq++}`;

export async function createUser(overrides: Partial<{
  firstName: string;
  lastName: string;
  email: string;
  defaultRole: UserRole;
}> = {}) {
  return prisma.user.create({
    data: {
      firstName: overrides.firstName ?? 'Test',
      lastName: overrides.lastName ?? 'User',
      email: overrides.email ?? `user-${uniq()}@example.com`,
      defaultRole: overrides.defaultRole ?? UserRole.CREW,
    },
  });
}

export async function createProject(ownerUserId: string, overrides: Partial<{ name: string }> = {}) {
  return prisma.project.create({
    data: {
      name: overrides.name ?? `Film ${uniq()}`,
      genre: 'Drama',
      language: ProjectLanguage.TELUGU,
      languages: [ProjectLanguage.TELUGU],
      ownerUserId,
    },
  });
}

export async function addMember(
  projectId: string,
  userId: string,
  overrides: Partial<{ role: UserRole; status: MembershipStatus }> = {},
) {
  return prisma.projectMember.create({
    data: {
      projectId,
      userId,
      role: overrides.role ?? UserRole.CREW,
      status: overrides.status ?? MembershipStatus.ACTIVE,
      acceptedAt: new Date(),
    },
  });
}

export async function createDepartment(
  projectId: string,
  overrides: Partial<{ kind: DepartmentKind; displayName: string }> = {},
) {
  return prisma.projectDepartment.create({
    data: {
      projectId,
      kind: overrides.kind ?? DepartmentKind.ART,
      displayName: overrides.displayName ?? 'Art',
    },
  });
}

export async function createTask(
  projectId: string,
  departmentId: string,
  overrides: Partial<{
    title: string;
    status: TaskStatus;
    priority: TaskPriority;
    assigneeUserId: string | null;
    dueDate: Date | null;
  }> = {},
) {
  return prisma.task.create({
    data: {
      projectId,
      departmentId,
      title: overrides.title ?? `Task ${uniq()}`,
      status: overrides.status ?? TaskStatus.TODO,
      priority: overrides.priority ?? TaskPriority.MEDIUM,
      assigneeUserId: overrides.assigneeUserId ?? null,
      dueDate: overrides.dueDate ?? null,
    },
  });
}

/** Bearer header for a user, signed with the same secret the API verifies. */
export function authHeader(userId: string, defaultRole: UserRole = UserRole.CREW): string {
  return `Bearer ${signJwt({ sub: userId, defaultRole })}`;
}
