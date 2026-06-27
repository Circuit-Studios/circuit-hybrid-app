import { api, wakeApi } from './client';

export type AppEnv = 'local' | 'dev' | 'prod';
export type SignupVerificationChannel = 'EMAIL' | 'PHONE';
export type LoginIdentifier = 'PHONE' | 'EMAIL' | 'BOTH';

export type FeatureFlagKey =
  | 'scripts.upload'
  | 'scripts.shootingPlan'
  | 'scripts.taskSuggestions'
  | 'team.invites'
  | 'auth.emailOtp'
  | 'auth.phoneOtp'
  | 'notifications.push';

export interface PublicAppConfig {
  appEnv: AppEnv;
  signupVerificationChannel: SignupVerificationChannel;
  loginIdentifier: LoginIdentifier;
  features: Record<string, boolean>;
}

export async function fetchAppConfig(): Promise<PublicAppConfig> {
  await wakeApi();
  const { data } = await api.get<PublicAppConfig>('/app/config');
  return data;
}
