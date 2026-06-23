import { env } from '../../config/env.js';
import { forbidden, notFound } from '../../lib/http.js';

/** Direct password register is local-dev only and gated by ALLOW_DIRECT_REGISTER. */
export function assertDirectRegisterAllowed(): void {
  if (env.APP_ENV !== 'local') {
    throw notFound('Not found');
  }
  if (!env.ALLOW_DIRECT_REGISTER) {
    throw forbidden('Direct registration is disabled. Use /auth/request-otp and /auth/verify-otp.');
  }
}
