import { Router } from 'express';
import { MembershipStatus, TaskStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { asyncHandler, forbidden } from '../../lib/http.js';
import { requireAuth } from '../../middleware/auth.js';

const router: Router = Router();

function startOfDay(d = new Date()): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d = new Date()): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function initials(first: string, last: string): string {
  const f = first.trim();
  const l = last.trim();
  if (!f && !l) return '?';
  if (!l) return f.slice(0, 2).toUpperCase();
  return (f[0]! + l[0]!).toUpperCase();
}

function relativeMinutes(iso: Date): string {
  const mins = Math.max(0, Math.floor((Date.now() - iso.getTime()) / 60_000));
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}hr`;
  return `${Math.floor(hrs / 24)}d`;
}

async function resolvePrimaryProjectId(userId: string, requested?: string): Promise<string> {
  const memberships = await prisma.projectMember.findMany({
    where: { userId, status: MembershipStatus.ACTIVE },
    select: { projectId: true, acceptedAt: true },
    orderBy: { acceptedAt: 'desc' },
  });
  if (memberships.length === 0) {
    throw forbidden('Join a project to view your command centre');
  }
  if (requested) {
    const hit = memberships.find((m) => m.projectId === requested);
    if (!hit) throw forbidden('You are not a member of that project');
    return requested;
  }
  return memberships[0]!.projectId;
}

// GET /home?projectId=...
router.get(
  '/home',
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = req.user!.sub;
    const requestedProjectId = req.query.projectId as string | undefined;
    const projectId = await resolvePrimaryProjectId(userId, requestedProjectId);
    const todayStart = startOfDay();
    const todayEnd = endOfDay();

    const user = await prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { firstName: true, lastName: true },
    });

    const [project, memberships, taskCounts, shootDays, teamActive] = await Promise.all([
      prisma.project.findUniqueOrThrow({
        where: { id: projectId },
        select: {
          id: true,
          name: true,
          currentStage: true,
          shootStartDate: true,
          shootEndDate: true,
        },
      }),
      prisma.projectMember.findMany({
        where: { userId, status: MembershipStatus.ACTIVE },
        include: {
          project: {
            select: {
              id: true,
              name: true,
              currentStage: true,
              shootStartDate: true,
            },
          },
        },
        orderBy: { acceptedAt: 'desc' },
      }),
      prisma.task.groupBy({
        by: ['status'],
        where: { projectId },
        _count: true,
      }),
      prisma.shootDay.findMany({
        where: { projectId },
        orderBy: { date: 'asc' },
        select: { id: true, dayNumber: true, date: true, location: true },
      }),
      prisma.projectMember.count({
        where: {
          projectId,
          status: MembershipStatus.ACTIVE,
          setStatus: { in: ['ON_SET', 'EN_ROUTE'] },
        },
      }),
    ]);

    const tasksDone = taskCounts.find((r) => r.status === TaskStatus.DONE)?._count ?? 0;
    const tasksTotal = taskCounts.reduce((sum, r) => sum + r._count, 0);

    const now = new Date();
    const shootCompleted = shootDays.filter((d) => d.date < todayStart).length;
    const shootTotal = shootDays.length;
    const nextShootDay =
      shootDays.find((d) => d.date >= todayStart) ?? shootDays[shootDays.length - 1] ?? null;

    const productions = await Promise.all(
      memberships.map(async (m) => {
        const [done, next] = await Promise.all([
          prisma.task.count({ where: { projectId: m.projectId, status: TaskStatus.DONE } }),
          prisma.shootDay.findFirst({
            where: { projectId: m.projectId, date: { gte: todayStart } },
            orderBy: { date: 'asc' },
            select: { dayNumber: true, date: true },
          }),
        ]);
        return {
          id: m.project.id,
          name: m.project.name,
          currentStage: m.project.currentStage,
          tasksDone: done,
          subtitle: next
            ? `Day ${next.dayNumber} shoot ${next.date.toDateString() === now.toDateString() ? 'today' : 'upcoming'}`
            : 'No shoot days scheduled',
        };
      }),
    );

    res.json({
      greeting: user.firstName.trim() || 'there',
      projectId,
      project,
      stats: {
        tasksDone,
        tasksTotal,
        shootDaysCompleted: shootCompleted,
        shootDaysTotal: shootTotal,
        teamActive,
      },
      nextShootDay,
      productions,
    });
  }),
);

type ActivityFilter = 'all' | 'tasks' | 'schedule' | 'team';

// GET /home/activity?projectId=...&filter=all|tasks|schedule|team
router.get(
  '/home/activity',
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = req.user!.sub;
    const requestedProjectId = req.query.projectId as string | undefined;
    const filter = (req.query.filter as ActivityFilter | undefined) ?? 'all';
    const projectId = await resolvePrimaryProjectId(userId, requestedProjectId);
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const todayStart = startOfDay();
    const todayEnd = endOfDay();

    const includeTasks = filter === 'all' || filter === 'tasks';
    const includeSchedule = filter === 'all' || filter === 'schedule';
    const includeTeam = filter === 'all' || filter === 'team';

    const [tasks, shootDays, members] = await Promise.all([
      includeTasks
        ? prisma.task.findMany({
            where: { projectId, updatedAt: { gte: since } },
            orderBy: { updatedAt: 'desc' },
            take: 40,
          })
        : Promise.resolve([]),
      includeSchedule
        ? prisma.shootDay.findMany({
            where: { projectId, date: { gte: since } },
            orderBy: { date: 'desc' },
            take: 20,
          })
        : Promise.resolve([]),
      includeTeam
        ? prisma.projectMember.findMany({
            where: {
              projectId,
              status: MembershipStatus.ACTIVE,
              acceptedAt: { gte: since },
            },
            include: {
              user: { select: { id: true, firstName: true, lastName: true } },
            },
            orderBy: { acceptedAt: 'desc' },
            take: 20,
          })
        : Promise.resolve([]),
    ]);

    const assigneeIds = [
      ...new Set(tasks.map((t) => t.assigneeUserId).filter(Boolean)),
    ] as string[];
    const assignees =
      assigneeIds.length > 0
        ? await prisma.user.findMany({
            where: { id: { in: assigneeIds } },
            select: { id: true, firstName: true, lastName: true },
          })
        : [];
    const assigneeById = new Map(assignees.map((u) => [u.id, u]));

    type FeedItem = {
      id: string;
      category: 'tasks' | 'schedule' | 'team';
      userId: string | null;
      userName: string;
      userInitials: string;
      action: string;
      targetLabel: string | null;
      statusBadge: string | null;
      createdAt: string;
      relativeTime: string;
    };

    const feed: FeedItem[] = [];

    for (const task of tasks) {
      const actor = task.assigneeUserId ? assigneeById.get(task.assigneeUserId) : undefined;
      const name = actor ? `${actor.firstName} ${actor.lastName}`.trim() : 'Someone';
      const badge =
        task.status === 'DONE'
          ? '✓ Completed'
          : task.status === 'IN_PROGRESS'
            ? 'In progress'
            : null;
      feed.push({
        id: `task-${task.id}`,
        category: 'tasks',
        userId: actor?.id ?? null,
        userName: name,
        userInitials: actor ? initials(actor.firstName, actor.lastName) : '??',
        action:
          task.status === 'DONE' ? `marked **${task.title}** done` : `updated **${task.title}**`,
        targetLabel: task.title,
        statusBadge: badge,
        createdAt: task.updatedAt.toISOString(),
        relativeTime: relativeMinutes(task.updatedAt),
      });
    }

    for (const day of shootDays) {
      feed.push({
        id: `shoot-${day.id}`,
        category: 'schedule',
        userId: null,
        userName: 'Schedule',
        userInitials: 'SC',
        action: `updated shoot day **${day.location ?? `Day ${day.dayNumber}`}**`,
        targetLabel: day.location,
        statusBadge: '📷 Shot list updated',
        createdAt: day.date.toISOString(),
        relativeTime: relativeMinutes(day.date),
      });
    }

    for (const member of members) {
      const u = member.user;
      const name = u ? `${u.firstName} ${u.lastName}`.trim() : (member.inviteeName ?? 'New member');
      feed.push({
        id: `member-${member.id}`,
        category: 'team',
        userId: u?.id ?? null,
        userName: name,
        userInitials: u ? initials(u.firstName, u.lastName) : 'NM',
        action: 'joined the production',
        targetLabel: null,
        statusBadge: '👤 Confirmed',
        createdAt: (member.acceptedAt ?? member.invitedAt).toISOString(),
        relativeTime: relativeMinutes(member.acceptedAt ?? member.invitedAt),
      });
    }

    feed.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

    const [actionsToday, tasksToday, activeToday] = await Promise.all([
      prisma.task.count({
        where: { projectId, updatedAt: { gte: todayStart, lte: todayEnd } },
      }),
      prisma.task.count({
        where: {
          projectId,
          status: TaskStatus.DONE,
          updatedAt: { gte: todayStart, lte: todayEnd },
        },
      }),
      prisma.projectMember.count({
        where: {
          projectId,
          status: MembershipStatus.ACTIVE,
          setStatus: { in: ['ON_SET', 'EN_ROUTE'] },
        },
      }),
    ]);

    res.json({
      projectId,
      pulse: {
        actions: actionsToday,
        tasks: tasksToday,
        active: activeToday,
      },
      items: feed.slice(0, 50),
    });
  }),
);

export default router;
