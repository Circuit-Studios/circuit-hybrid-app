import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UserRole } from '@prisma/client';
import {
  assertDeptHeadDepartmentScope,
  can,
  rolePermissions,
} from '../../src/auth/permissions.js';

describe('permissions', () => {
  it('grants task create to directors', () => {
    expect(can(UserRole.DIRECTOR, 'tasks.create')).toBe(true);
  });

  it('denies task delete to crew', () => {
    expect(can(UserRole.CREW, 'tasks.delete')).toBe(false);
  });

  it('allows crew to update task status only', () => {
    expect(can(UserRole.CREW, 'tasks.updateStatus')).toBe(true);
    expect(can(UserRole.CREW, 'tasks.update')).toBe(false);
  });

  it('scopes department heads to their own department', () => {
    expect(() =>
      assertDeptHeadDepartmentScope(
        { id: 'm1', role: UserRole.DEPT_HEAD, projectDepartmentId: 'dept-a' },
        'dept-b',
      ),
    ).toThrow('Department heads can only manage their own department');
  });

  it('allows department heads within their department', () => {
    expect(() =>
      assertDeptHeadDepartmentScope(
        { id: 'm1', role: UserRole.DEPT_HEAD, projectDepartmentId: 'dept-a' },
        'dept-a',
      ),
    ).not.toThrow();
  });

  it('defines permissions for every role', () => {
    for (const role of Object.values(UserRole)) {
      expect(rolePermissions[role]).toBeDefined();
    }
  });
});
