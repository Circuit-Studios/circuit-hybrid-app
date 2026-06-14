// Module 5 — Cross-project conflict + alert engine.
//
// Three categories of conflict, in priority order:
//
//   1. SCHEDULE_CLASH: an actor or AD is on call for two different projects
//      on the same date. This is the headline use case from the PDF — many
//      Tollywood/Bollywood actors juggle 2–4 projects at once.
//
//   2. DEPT_BEHIND: a required department's progress is dangerously low
//      relative to how close we are to shoot start.
//
//   3. MISSING_DEPENDENCY: a scene needs a department's deliverable on a
//      specific shoot day but no DONE task exists for it. (V1 stub — for
//      MVP we just flag stunt/VFX scenes without a DONE task in the
//      respective department.)

import {
  ConflictKind,
  ConflictSeverity,
  MembershipStatus,
  UserRole,
} from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { logger } from '../lib/logger.js';
import { formatUserName } from '../lib/user-name.js';
import { emitToProject } from '../realtime/socket.js';
import { dispatchNotification } from '../notifications/notifications.service.js';

export interface ConflictScanInput {
  projectId: string;
  reason?: string;
  shootDayId?: string;
}

// Wraps a single project scan. Reads the relevant tables, computes alerts,
// reconciles with already-open alerts to avoid spamming the same notification
// every time the worker re-runs.
export async function scanProjectConflicts(input: ConflictScanInput): Promise<{
  created: number;
  resolved: number;
}> {
  const { projectId } = input;
  logger.info({ projectId, reason: input.reason }, 'Conflict scan begin');

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      name: true,
      shootStartDate: true,
      shootEndDate: true,
    },
  });
  if (!project) return { created: 0, resolved: 0 };

  // Re-derive the full active conflict set this run produces. Anything in
  // the DB that's open + matches kind+contextJson and isn't produced this
  // time is auto-resolved. Anything new gets inserted.
  type Candidate = {
    kind: ConflictKind;
    severity: ConflictSeverity;
    title: string;
    body: string;
    dedupeKey: string;
    contextJson: Record<string, unknown>;
  };
  const candidates: Candidate[] = [];

  // ---- 1) Schedule clash detection (cross-project) ----
  const memberships = await prisma.projectMember.findMany({
    where: { projectId, status: MembershipStatus.ACTIVE, userId: { not: null } },
    select: { userId: true, role: true, user: { select: { firstName: true, lastName: true } } },
  });

  const userIds = memberships.map(m => m.userId!).filter(Boolean);
  if (userIds.length > 0) {
    // For each of this project's shoot days, find any *other* project's
    // shoot day with a matching call-time member where:
    //   - the member's userId belongs to a current member of this project AND
    //   - the date is the same calendar day
    const days = await prisma.shootDay.findMany({
      where: { projectId },
      include: {
        calls: { include: { projectMember: { select: { userId: true } } } },
      },
    });

    for (const day of days) {
      const dayStart = new Date(day.date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);

      // For every member called on this day, check other projects.
      for (const call of day.calls) {
        const otherUserId = call.projectMember.userId;
        if (!otherUserId) continue;
        const clash = await prisma.shootDayCall.findFirst({
          where: {
            projectMember: {
              userId: otherUserId,
              projectId: { not: projectId },
              status: MembershipStatus.ACTIVE,
            },
            shootDay: { date: { gte: dayStart, lt: dayEnd } },
          },
          include: {
            shootDay: { include: { project: { select: { id: true, name: true } } } },
            projectMember: { include: { user: { select: { firstName: true, lastName: true } } } },
          },
        });

        if (clash) {
          const personName = clash.projectMember.user
            ? formatUserName(clash.projectMember.user)
            : 'A teammate';
          candidates.push({
            kind: ConflictKind.SCHEDULE_CLASH,
            severity: ConflictSeverity.CRITICAL,
            title: `${personName} is booked on two shoots on ${dayStart.toDateString()}`,
            body: `Also called on "${clash.shootDay.project.name}" the same day. Resolve before the call sheet locks.`,
            dedupeKey: `clash:${otherUserId}:${dayStart.toISOString()}:${clash.shootDay.project.id}`,
            contextJson: {
              userId: otherUserId,
              userName: personName,
              date: dayStart.toISOString(),
              otherProjectId: clash.shootDay.project.id,
              otherProjectName: clash.shootDay.project.name,
              ourShootDayId: day.id,
            },
          });
        }
      }
    }
  }

  // ---- 2) Department-behind detection ----
  if (project.shootStartDate) {
    const daysUntilShoot = Math.ceil(
      (project.shootStartDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000),
    );
    if (daysUntilShoot >= 0 && daysUntilShoot <= 60) {
      const required = await prisma.projectDepartment.findMany({
        where: { projectId, required: true },
        select: { id: true, displayName: true, kind: true, progress: true },
      });

      // Sliding threshold: at 60 days out, expect 25%+ progress; at 14 days
      // out, expect 80%+. Linear interpolation.
      const expected = Math.round(25 + ((60 - daysUntilShoot) / 46) * 55);
      for (const dept of required) {
        if (dept.progress < expected) {
          const severity =
            daysUntilShoot <= 14
              ? ConflictSeverity.CRITICAL
              : daysUntilShoot <= 30
              ? ConflictSeverity.WARNING
              : ConflictSeverity.INFO;
          candidates.push({
            kind: ConflictKind.DEPT_BEHIND,
            severity,
            title: `${dept.displayName} is behind for shoot start in ${daysUntilShoot} days`,
            body: `${dept.displayName} is at ${dept.progress}% but should be ~${expected}% by now.`,
            dedupeKey: `dept-behind:${dept.id}`,
            contextJson: {
              departmentId: dept.id,
              departmentKind: dept.kind,
              progress: dept.progress,
              expectedProgress: expected,
              daysUntilShoot,
            },
          });
        }
      }
    }
  }

  // ---- 3) Missing dependency for stunt/VFX scenes ----
  const stuntVfxDays = await prisma.shootDay.findMany({
    where: {
      projectId,
      date: { gte: new Date() },
      scenes: { some: { scene: { OR: [{ hasStunts: true }, { hasVFX: true }] } } },
    },
    include: {
      scenes: {
        include: { scene: { select: { id: true, sceneNumber: true, hasStunts: true, hasVFX: true } } },
      },
    },
  });

  for (const day of stuntVfxDays) {
    for (const link of day.scenes) {
      const scene = link.scene;
      if (scene.hasStunts) {
        const taskDone = await prisma.task.findFirst({
          where: {
            projectId,
            sceneId: scene.id,
            department: { kind: 'STUNTS' },
            status: 'DONE',
          },
          select: { id: true },
        });
        if (!taskDone) {
          candidates.push({
            kind: ConflictKind.MISSING_DEPENDENCY,
            severity: ConflictSeverity.WARNING,
            title: `Stunt prep missing for scene ${scene.sceneNumber}`,
            body: `Scene ${scene.sceneNumber} shoots on ${day.date.toDateString()} but no DONE stunt task exists yet.`,
            dedupeKey: `missing-dep:stunts:${scene.id}`,
            contextJson: { sceneId: scene.id, shootDayId: day.id, department: 'STUNTS' },
          });
        }
      }
      if (scene.hasVFX) {
        const taskDone = await prisma.task.findFirst({
          where: {
            projectId,
            sceneId: scene.id,
            department: { kind: 'VFX' },
            status: 'DONE',
          },
          select: { id: true },
        });
        if (!taskDone) {
          candidates.push({
            kind: ConflictKind.MISSING_DEPENDENCY,
            severity: ConflictSeverity.WARNING,
            title: `VFX prep missing for scene ${scene.sceneNumber}`,
            body: `Scene ${scene.sceneNumber} shoots on ${day.date.toDateString()} but no DONE VFX task exists yet.`,
            dedupeKey: `missing-dep:vfx:${scene.id}`,
            contextJson: { sceneId: scene.id, shootDayId: day.id, department: 'VFX' },
          });
        }
      }
    }
  }

  // ---- Reconcile with DB ----
  const open = await prisma.conflictAlert.findMany({
    where: { projectId, resolved: false },
    select: { id: true, contextJson: true, kind: true },
  });

  // Map open alerts by their dedupeKey (stored inside contextJson._dedupe so
  // we don't need a new column). Anything we DON'T regenerate this run gets
  // resolved.
  const openByKey = new Map<string, string>();
  for (const alert of open) {
    const ctx = alert.contextJson as Record<string, unknown> | null;
    const key = typeof ctx?._dedupe === 'string' ? ctx._dedupe : null;
    if (key) openByKey.set(key, alert.id);
  }

  // Pre-load the leadership roster once — same recipients for almost
  // every alert kind, so a single query beats fanning out per alert.
  const MANAGER_ROLES: UserRole[] = [
    UserRole.DIRECTOR,
    UserRole.PRODUCER,
    UserRole.EXECUTIVE_PRODUCER,
    UserRole.LINE_PRODUCER,
    UserRole.AD,
  ];
  const leadership = await prisma.projectMember.findMany({
    where: {
      projectId,
      status: MembershipStatus.ACTIVE,
      role: { in: MANAGER_ROLES },
      userId: { not: null },
    },
    select: { userId: true },
  });
  const leadershipUserIds = leadership.map(m => m.userId!).filter(Boolean);

  let created = 0;
  for (const cand of candidates) {
    if (openByKey.has(cand.dedupeKey)) {
      openByKey.delete(cand.dedupeKey);
      continue;
    }
    const alert = await prisma.conflictAlert.create({
      data: {
        projectId,
        kind: cand.kind,
        severity: cand.severity,
        title: cand.title,
        body: cand.body,
        contextJson: { ...cand.contextJson, _dedupe: cand.dedupeKey },
      },
    });
    created += 1;

    // ---- Fan-out notifications --------------------------------------
    // Recipients vary by kind:
    //   - SCHEDULE_CLASH: leadership + the person actually clashing
    //   - DEPT_BEHIND: leadership + that department's head
    //   - MISSING_DEPENDENCY: leadership + that department's head
    const recipientSet = new Set<string>(leadershipUserIds);
    if (cand.kind === ConflictKind.SCHEDULE_CLASH) {
      const personId = cand.contextJson.userId;
      if (typeof personId === 'string') recipientSet.add(personId);
    } else if (
      cand.kind === ConflictKind.DEPT_BEHIND ||
      cand.kind === ConflictKind.MISSING_DEPENDENCY
    ) {
      const departmentId = cand.contextJson.departmentId;
      const departmentKind = cand.contextJson.department;
      const head = await prisma.projectMember.findFirst({
        where: {
          projectId,
          role: UserRole.DEPT_HEAD,
          status: MembershipStatus.ACTIVE,
          OR: [
            ...(typeof departmentId === 'string' ? [{ projectDepartmentId: departmentId }] : []),
            ...(typeof departmentKind === 'string'
              ? [{ projectDepartment: { kind: departmentKind as never } }]
              : []),
          ],
        },
        select: { userId: true },
      });
      if (head?.userId) recipientSet.add(head.userId);
    }

    void dispatchNotification({
      userIds: [...recipientSet],
      kind: 'CONFLICT_ALERT',
      title: cand.title,
      body: cand.body,
      projectId,
      deepLink: `/project/${projectId}`,
      context: {
        alertId: alert.id,
        conflictKind: cand.kind,
        severity: cand.severity,
        ...cand.contextJson,
      },
    });
  }

  // Anything still in openByKey is stale → resolve.
  let resolved = 0;
  if (openByKey.size > 0) {
    const toResolve = [...openByKey.values()];
    await prisma.conflictAlert.updateMany({
      where: { id: { in: toResolve } },
      data: { resolved: true, resolvedAt: new Date() },
    });
    resolved = toResolve.length;
    for (const id of toResolve) emitToProject(projectId, 'conflict.resolved', { id });
  }

  if (created > 0) emitToProject(projectId, 'conflict.created', { count: created });

  logger.info({ projectId, created, resolved }, 'Conflict scan complete');
  return { created, resolved };
}
