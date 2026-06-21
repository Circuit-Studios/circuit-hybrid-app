import { api, wakeApi } from './client';
import type { UserRole, VerifyOtpResponse, AuthUser } from './types';

export type AuthSessionResponse = VerifyOtpResponse;

export type OtpPurpose = 'signup' | 'login';
export type OtpChannel = 'PHONE' | 'EMAIL';

export type RequestOtpInput =
  | { channel: 'EMAIL'; email: string; purpose?: OtpPurpose }
  | { channel: 'PHONE'; phone: string; purpose?: OtpPurpose };

export async function requestOtp(
  input: RequestOtpInput,
): Promise<{ ok: boolean; ttlSeconds: number }> {
  await wakeApi();
  const { data } = await api.post<{ ok: boolean; ttlSeconds: number }>('/auth/request-otp', input);
  return data;
}

export type VerifyOtpInput =
  | {
      channel: 'EMAIL';
      email: string;
      code: string;
      signup?: {
        firstName: string;
        lastName: string;
        role: UserRole;
        password?: string;
        phone?: string;
      };
    }
  | {
      channel: 'PHONE';
      phone: string;
      code: string;
      signup?: {
        firstName: string;
        lastName: string;
        role: UserRole;
        password?: string;
        email?: string;
      };
    };

export async function verifyOtp(input: VerifyOtpInput): Promise<VerifyOtpResponse> {
  const { data } = await api.post<VerifyOtpResponse>('/auth/verify-otp', input);
  return data;
}

export async function getMe(): Promise<{ user: AuthUser }> {
  const { data } = await api.get<{ user: AuthUser }>('/auth/me');
  return data;
}
