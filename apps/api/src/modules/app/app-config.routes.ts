import { Router } from 'express';
import { asyncHandler } from '../../lib/http.js';
import { getPublicAppConfig } from '../../config/app-config.js';

const router: Router = Router();

/** GET /app/config — public runtime config for mobile (no secrets). */
router.get(
  '/app/config',
  asyncHandler(async (_req, res) => {
    res.json(await getPublicAppConfig());
  }),
);

export default router;
