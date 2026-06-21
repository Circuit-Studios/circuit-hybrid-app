import { api, wakeApi } from './client';
import type { UserRole, VerifyOtpResponse, AuthUser } from './types';

export type AuthSessionResponse = VerifyOtpResponse;

export type OtpPurpose = 'signup' | 'login';

export async function requestOtp(
  email: string,
  purpose?: OtpPurpose,
): Promise<{ ok: boolean; ttlSeconds: number }> {
  await wakeApi();
  const { data } = await api.post<{ ok: boolean; ttlSeconds: number }>('/auth/request-otp', {
    email,
    purpose,
  });
  return data;
}

export interface VerifyOtpInput {
  email: string;
  code: string;
  signup?: {
    firstName: string;
    lastName: string;
    role: UserRole;
    password?: string;
  };
}

export async function verifyOtp(input: VerifyOtpInput): Promise<VerifyOtpResponse> {
  const { data } = await api.post<VerifyOtpResponse>('/auth/verify-otp', input);
  return data;
}

export async function getMe(): Promise<{ user: AuthUser }> {
  const { data } = await api.get<{ user: AuthUser }>('/auth/me');
  return data;
}
