import { env } from '../../config/env.js';
import { forbidden, notFound } from '../../lib/http.js';

/**
 * Direct password register — local-dev only (`APP_ENV=local` + `ALLOW_DIRECT_REGISTER=true`).
 * Returns 404 outside local so the route is not discoverable in staging/prod.
 *
 * TODO(App Store): delete `POST /auth/register`, `directRegisterSchema`, and this policy.
 */
export function assertDirectRegisterAllowed(): void {
  if (env.APP_ENV !== 'local') {
    throw notFound('Not found');
  }
  if (!env.ALLOW_DIRECT_REGISTER) {
    throw forbidden('Direct registration is disabled. Use /auth/request-otp and /auth/verify-otp.');
  }
}
