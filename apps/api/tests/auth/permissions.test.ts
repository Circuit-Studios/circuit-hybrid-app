import { describe, expect, it } from 'vitest';
import { UserRole } from '@prisma/client';
import { assertDeptHeadDepartmentScope, can } from '../../src/auth/permissions.js';

describe('permissions', () => {
  it('grants directors task create and denies crew task delete', () => {
    expect(can(UserRole.DIRECTOR, 'tasks.create')).toBe(true);
    expect(can(UserRole.CREW, 'tasks.delete')).toBe(false);
  });

  it('scopes department heads to their own department', () => {
    expect(() =>
      assertDeptHeadDepartmentScope(
        { id: 'm1', role: UserRole.DEPT_HEAD, projectDepartmentId: 'dept-a' },
        'dept-b',
      ),
    ).toThrow('Department heads can only manage their own department');
  });
});
