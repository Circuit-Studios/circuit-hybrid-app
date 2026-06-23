import { Router } from 'express';
import multer from 'multer';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { MembershipStatus, ScriptAnalysisStatus, UserRole } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { asyncHandler, badRequest, forbidden, notFound } from '../../lib/http.js';
import { requireAuth } from '../../middleware/auth.js';
import { requireFeature } from '../../middleware/require-feature.js';
import { canEditScripts, canInviteMembers, getActiveMembership } from '../../auth/permissions.js';
import { analyzeScript } from '../../ai/pipelines/script-analysis.pipeline.js';
import { logger } from '../../lib/logger.js';
import { getStorage } from '../../storage/index.js';

const router: Router = Router();

// We buffer the upload in memory then hand bytes to the storage provider.
// 25 MB max — large enough for a 400-page screenplay PDF, small enough to
// keep memory pressure sane in a single-process deployment.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype !== 'application/pdf') {
      return cb(new Error('Only PDF scripts are accepted'));
    }
    cb(null, true);
  },
});

async function assertCanEditProject(userId: string, projectId: string): Promise<void> {
  const membership = await getActiveMembership(userId, projectId);
  if (!membership) throw forbidden('You are not a member of this project');
  if (!canEditScripts(membership.role)) {
    throw forbidden(`Role ${membership.role} cannot upload scripts`);
  }
}

router.post(
  '/projects/:projectId/scripts',
  requireAuth,
  requireFeature('scripts.upload'),
  upload.single('script'),
  asyncHandler(async (req, res) => {
    const projectId = req.params.projectId!;
    const userId = req.user!.sub;
    await assertCanEditProject(userId, projectId);

    if (!req.file) throw badRequest('Missing script file (field "script")');

    // Object keys are deterministic-ish per script for clean tracing: every
    // file lives under scripts/<projectId>/<uuid><ext>. Easy to inventory.
    const ext = path.extname(req.file.originalname);
    const objectKey = `scripts/${projectId}/${randomUUID()}${ext}`;

    const stored = await getStorage().put({
      key: objectKey,
      body: req.file.buffer,
      contentType: req.file.mimetype,
    });

    const script = await prisma.script.create({
      data: {
        projectId,
        uploadedByUserId: userId,
        originalFileName: req.file.originalname,
        storageKey: stored.storageKey,
        mimeType: req.file.mimetype,
        sizeBytes: BigInt(req.file.size),
        analysisStatus: ScriptAnalysisStatus.PENDING,
      },
    });

    res.status(201).json(serializeScript(script));
  }),
);

router.post(
  '/scripts/:scriptId/analyze',
  requireAuth,
  requireFeature('scripts.aiAnalysis'),
  asyncHandler(async (req, res) => {
    const scriptId = req.params.scriptId!;
    const userId = req.user!.sub;

    const script = await prisma.script.findUnique({
      where: { id: scriptId },
      include: { project: true },
    });
    if (!script) throw notFound('Script not found');

    await assertCanEditProject(userId, script.projectId);

    if (
      script.analysisStatus !== ScriptAnalysisStatus.PENDING &&
      script.analysisStatus !== ScriptAnalysisStatus.FAILED &&
      script.analysisStatus !== ScriptAnalysisStatus.COMPLETED
    ) {
      throw badRequest(`Analysis already in progress (status=${script.analysisStatus})`);
    }

    // Fire-and-forget. The pipeline emits its own progress updates which
    // the workspace screens listen to over Socket.IO.
    void analyzeScript(scriptId).catch((err) => {
      logger.error({ err, scriptId }, 'analyzeScript background failure');
    });

    res.status(202).json({ status: 'STARTED', scriptId });
  }),
);

router.get(
  '/scripts/:scriptId/analysis',
  requireAuth,
  asyncHandler(async (req, res) => {
    const scriptId = req.params.scriptId!;
    const userId = req.user!.sub;

    const script = await prisma.script.findUnique({
      where: { id: scriptId },
    });
    if (!script) throw notFound('Script not found');

    const membership = await prisma.projectMember.findFirst({
      where: { projectId: script.projectId, userId, status: MembershipStatus.ACTIVE },
      select: { role: true },
    });
    if (!membership) throw forbidden('You are not a member of this project');

    res.json({
      script: serializeScript(script),
      summary: script.aiSummary,
    });
  }),
);

// Stream the raw PDF back to a client. Used by the upcoming "view script"
// drawer in the workspace. Permission check matches read access.
router.get(
  '/scripts/:scriptId/file',
  requireAuth,
  asyncHandler(async (req, res) => {
    const scriptId = req.params.scriptId!;
    const userId = req.user!.sub;

    const script = await prisma.script.findUnique({ where: { id: scriptId } });
    if (!script) throw notFound('Script not found');

    const membership = await prisma.projectMember.findFirst({
      where: { projectId: script.projectId, userId, status: MembershipStatus.ACTIVE },
      select: { id: true },
    });
    if (!membership) throw forbidden('You are not a member of this project');

    const obj = await getStorage().get(script.storageKey);
    res.setHeader('Content-Type', obj.contentType);
    res.setHeader('Content-Length', String(obj.contentLength));
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${script.originalFileName.replace(/"/g, '')}"`,
    );
    obj.stream.pipe(res);
  }),
);

function serializeScript<T extends { sizeBytes: bigint }>(s: T) {
  return { ...s, sizeBytes: Number(s.sizeBytes) };
}

export default router;
