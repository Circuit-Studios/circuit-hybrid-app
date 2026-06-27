import { Router } from 'express';
import { z } from 'zod';
import { TaskSuggestionStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { asyncHandler, badRequest, forbidden, notFound } from '../../lib/http.js';
import { requireAuth } from '../../middleware/auth.js';
import { requireFeature } from '../../middleware/require-feature.js';
import { getActiveMembership } from '../../auth/permissions.js';
import {
  applyShootingPlanToSchedule,
  approveTaskSuggestion,
  bulkApproveTaskSuggestions,
  getLatestShootingPlan,
  listTaskSuggestions,
  rejectTaskSuggestion,
} from './task-suggestions.service.js';

const router: Router = Router();

const bulkApproveSchema = z.object({
  projectId: z.string().uuid(),
  ids: z.array(z.string().uuid()).min(1).max(100),
});

router.get(
  '/projects/:projectId/task-suggestions',
  requireAuth,
  requireFeature('scripts.taskSuggestions'),
  asyncHandler(async (req, res) => {
    const projectId = req.params.projectId!;
    const userId = req.user!.sub;
    const statusParam = req.query.status as string | undefined;

    const membership = await getActiveMembership(userId, projectId);
    if (!membership) throw forbidden('You are not a member of this project');

    const status =
      statusParam &&
      Object.values(TaskSuggestionStatus).includes(statusParam as TaskSuggestionStatus)
        ? (statusParam as TaskSuggestionStatus)
        : undefined;

    const suggestions = await listTaskSuggestions(projectId, status);
    res.json({ suggestions });
  }),
);

router.get(
  '/projects/:projectId/shooting-plan',
  requireAuth,
  requireFeature('scripts.shootingPlan'),
  asyncHandler(async (req, res) => {
    const projectId = req.params.projectId!;
    const userId = req.user!.sub;
    const scriptId = typeof req.query.scriptId === 'string' ? req.query.scriptId : undefined;

    const membership = await getActiveMembership(userId, projectId);
    if (!membership) throw forbidden('You are not a member of this project');

    const plan = await getLatestShootingPlan(projectId, scriptId);
    if (!plan) throw notFound('No shooting plan found for this project');
    res.json({ plan });
  }),
);

// POST /projects/:projectId/shooting-plan/apply
//   Materialize the latest AI shooting plan into ShootDay rows on the schedule.
router.post(
  '/projects/:projectId/shooting-plan/apply',
  requireAuth,
  requireFeature('scripts.shootingPlan'),
  asyncHandler(async (req, res) => {
    const projectId = req.params.projectId!;
    const userId = req.user!.sub;
    const scriptId = typeof req.body?.scriptId === 'string' ? req.body.scriptId : undefined;

    const result = await applyShootingPlanToSchedule(projectId, userId, scriptId);
    res.status(201).json(result);
  }),
);

router.post(
  '/task-suggestions/:id/approve',
  requireAuth,
  requireFeature('scripts.taskSuggestions'),
  asyncHandler(async (req, res) => {
    const id = req.params.id!;
    const updated = await approveTaskSuggestion(id, req.user!.sub);
    res.json({ suggestion: updated });
  }),
);

router.post(
  '/task-suggestions/:id/reject',
  requireAuth,
  requireFeature('scripts.taskSuggestions'),
  asyncHandler(async (req, res) => {
    const id = req.params.id!;
    const updated = await rejectTaskSuggestion(id, req.user!.sub);
    res.json({ suggestion: updated });
  }),
);

router.post(
  '/task-suggestions/bulk-approve',
  requireAuth,
  requireFeature('scripts.taskSuggestions'),
  asyncHandler(async (req, res) => {
    const body = bulkApproveSchema.parse(req.body);
    const membership = await getActiveMembership(req.user!.sub, body.projectId);
    if (!membership) throw forbidden('You are not a member of this project');

    const rows = await prisma.taskSuggestion.findMany({
      where: { id: { in: body.ids }, projectId: body.projectId },
      select: { id: true },
    });
    if (rows.length !== body.ids.length) {
      throw badRequest('One or more suggestions were not found for this project');
    }

    const updated = await bulkApproveTaskSuggestions(body.projectId, req.user!.sub, body.ids);
    res.json({ suggestions: updated });
  }),
);

export default router;
