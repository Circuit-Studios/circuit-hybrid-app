import type { UserRole } from '@/api/types';
import type { FeatureFlagKey } from '@/api/appConfig';

type FeatureAccessInput = {
  feature: FeatureFlagKey;
  role?: UserRole | null;
  flags: Record<string, boolean>;
};

/** UI-only helper — backend remains the source of truth for enforcement. */
export function canUseFeature({ feature, flags }: FeatureAccessInput): boolean {
  return flags[feature] ?? true;
}

export function isSignupChannel(
  channel: 'EMAIL' | 'PHONE',
  signupVerificationChannel: 'EMAIL' | 'PHONE',
): boolean {
  return channel === signupVerificationChannel;
}

export function supportsLoginChannel(
  channel: 'EMAIL' | 'PHONE',
  loginIdentifier: 'PHONE' | 'EMAIL' | 'BOTH',
): boolean {
  if (loginIdentifier === 'BOTH') return true;
  return loginIdentifier === channel;
}
