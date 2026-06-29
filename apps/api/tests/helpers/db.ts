import { prisma } from '../../src/lib/prisma.js';

/**
 * Wipes the tables touched by integration tests. Cascades from Project/User
 * clear members, departments, and tasks, but we list them explicitly so the
 * intent is obvious and identity sequences reset.
 */
export async function resetDb(): Promise<void> {
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "Task", "ProjectDepartment", "ProjectMember", "Project", "User" RESTART IDENTITY CASCADE',
  );
}

export { prisma };
