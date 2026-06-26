import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DepartmentKind, TaskSuggestionStatus } from '@prisma/client';

const prismaMock = {
  taskSuggestion: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  projectDepartment: {
    findUnique: vi.fn(),
    create: vi.fn(),
  },
  task: {
    create: vi.fn(),
  },
  $transaction: vi.fn(),
};

vi.mock('../../src/lib/prisma.js', () => ({ prisma: prismaMock }));

vi.mock('../../src/auth/permissions.js', () => ({
  getActiveMembership: vi.fn().mockResolvedValue({ role: 'DIRECTOR' }),
  canManageSchedule: vi.fn().mockReturnValue(true),
}));

describe('approveTaskSuggestion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.$transaction.mockImplementation(async (fn: (tx: typeof prismaMock) => unknown) =>
      fn(prismaMock),
    );
  });

  it('creates a Task row and marks suggestion CONVERTED', async () => {
    prismaMock.taskSuggestion.findUnique.mockResolvedValue({
      id: 'sug-1',
      projectId: 'proj-1',
      status: TaskSuggestionStatus.PENDING,
      title: 'Book location scout',
      description: 'EXT nights',
      departmentKind: DepartmentKind.LOCATION,
      priority: 'HIGH',
      estimatedDueOffsetDays: 7,
    });
    prismaMock.projectDepartment.findUnique.mockResolvedValue({ id: 'dept-1' });
    prismaMock.task.create.mockResolvedValue({ id: 'task-1' });
    prismaMock.taskSuggestion.update.mockResolvedValue({
      id: 'sug-1',
      status: TaskSuggestionStatus.CONVERTED,
      convertedTaskId: 'task-1',
    });

    const { approveTaskSuggestion } =
      await import('../../src/modules/task-suggestions/task-suggestions.service.js');
    const updated = await approveTaskSuggestion('sug-1', 'user-1');

    expect(prismaMock.task.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          projectId: 'proj-1',
          departmentId: 'dept-1',
          title: 'Book location scout',
        }),
      }),
    );
    expect(updated.status).toBe(TaskSuggestionStatus.CONVERTED);
  });
});
