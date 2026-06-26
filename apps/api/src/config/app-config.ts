import { env } from '../config/env.js';
import { getPublicFeatureFlags } from '../config/features.js';

export interface PublicAppConfig {
  appEnv: typeof env.APP_ENV;
  signupVerificationChannel: typeof env.SIGNUP_VERIFICATION_CHANNEL;
  loginIdentifier: typeof env.LOGIN_IDENTIFIER;
  features: Record<string, boolean>;
}

export async function getPublicAppConfig(): Promise<PublicAppConfig> {
  return {
    appEnv: env.APP_ENV,
    signupVerificationChannel: env.SIGNUP_VERIFICATION_CHANNEL,
    loginIdentifier: env.LOGIN_IDENTIFIER,
    features: await getPublicFeatureFlags(),
  };
}
