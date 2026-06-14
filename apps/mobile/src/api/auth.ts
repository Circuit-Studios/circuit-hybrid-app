import { api, wakeApi } from './client';
import type { UserRole, VerifyOtpResponse, AuthUser } from './types';

export type AuthSessionResponse = VerifyOtpResponse;

export async function login(phone: string, password: string): Promise<AuthSessionResponse> {
  const { data } = await api.post<AuthSessionResponse>('/auth/login', { phone, password });
  return data;
}

export type OtpPurpose = 'signup' | 'login';

export async function requestOtp(
  phone: string,
  purpose?: OtpPurpose,
): Promise<{ ok: boolean; ttlSeconds: number }> {
  await wakeApi();
  const { data } = await api.post<{ ok: boolean; ttlSeconds: number }>('/auth/request-otp', {
    phone,
    purpose,
  });
  return data;
}

export interface VerifyOtpInput {
  phone: string;
  code: string;
  signup?: {
    firstName: string;
    lastName: string;
    role: UserRole;
    password: string;
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
