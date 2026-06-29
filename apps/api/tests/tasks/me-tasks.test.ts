import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { MembershipStatus, TaskStatus } from '@prisma/client';
import request from 'supertest';
import { app } from '../helpers/app.js';
import { prisma, resetDb } from '../helpers/db.js';
import {
  addMember,
  authHeader,
  createDepartment,
  createProject,
  createTask,
  createUser,
} from '../helpers/factories.js';

describe('GET /me/tasks', () => {
  beforeEach(async () => {
    await resetDb();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('requires authentication', async () => {
    const res = await request(app).get('/me/tasks');
    expect(res.status).toBe(401);
  });

  it('scopes results to assigned tasks in active memberships', async () => {
    const me = await createUser();
    const other = await createUser();
    const owner = await createUser();

    const activeProject = await createProject(owner.id, { name: 'Spirit' });
    await addMember(activeProject.id, me.id, { status: MembershipStatus.ACTIVE });
    const activeDept = await createDepartment(activeProject.id, { displayName: 'Camera' });

    const mine = await createTask(activeProject.id, activeDept.id, {
      assigneeUserId: me.id,
      title: 'Mine',
      status: TaskStatus.TODO,
    });
    const done = await createTask(activeProject.id, activeDept.id, {
      assigneeUserId: me.id,
      title: 'Done task',
      status: TaskStatus.DONE,
    });
    await createTask(activeProject.id, activeDept.id, { assigneeUserId: other.id, title: 'Theirs' });
    await createTask(activeProject.id, activeDept.id, { assigneeUserId: null, title: 'Unassigned' });

    const removedProject = await createProject(owner.id);
    await addMember(removedProject.id, me.id, { status: MembershipStatus.REMOVED });
    const removedDept = await createDepartment(removedProject.id);
    await createTask(removedProject.id, removedDept.id, { assigneeUserId: me.id });

    const allRes = await request(app).get('/me/tasks').set('Authorization', authHeader(me.id));
    expect(allRes.status).toBe(200);
    expect(allRes.body.map((t: { id: string }) => t.id).sort()).toEqual([mine.id, done.id].sort());

    const doneRes = await request(app)
      .get('/me/tasks')
      .query({ status: 'DONE' })
      .set('Authorization', authHeader(me.id));
    expect(doneRes.status).toBe(200);
    expect(doneRes.body).toHaveLength(1);
    expect(doneRes.body[0]).toMatchObject({
      id: done.id,
      project: { id: activeProject.id, name: 'Spirit' },
      department: { id: activeDept.id, displayName: 'Camera' },
    });
  });
});
