import { api, wakeApi } from './client';
import type { UserRole, VerifyOtpResponse, AuthUser } from './types';

export type AuthSessionResponse = VerifyOtpResponse;

export type OtpPurpose = 'signup' | 'login' | 'verify_email';
export type OtpChannel = 'PHONE' | 'EMAIL';

export type RequestOtpInput =
  | { channel: 'EMAIL'; email: string; purpose?: OtpPurpose }
  | { channel: 'PHONE'; phone: string; purpose?: OtpPurpose };

/** POST /send-otp — post-account email verification only (not signup/login). */
export async function sendEmailVerificationOtp(
  email: string,
  purpose: 'verify_email' = 'verify_email',
): Promise<{ ok: boolean; message: string; ttlSeconds: number }> {
  await wakeApi();
  const { data } = await api.post<{ ok: boolean; message: string; ttlSeconds: number }>(
    '/send-otp',
    { email, purpose },
  );
  return data;
}

/** POST /verify-otp — confirm post-account email verification. */
export async function verifyEmailVerificationOtp(
  email: string,
  otp: string,
  purpose: 'verify_email' = 'verify_email',
): Promise<{ ok: boolean; message: string; emailVerified: boolean }> {
  const { data } = await api.post<{
    ok: boolean;
    message: string;
    emailVerified: boolean;
  }>('/verify-otp', { email, otp, purpose });
  return data;
}

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

export async function loginWithPassword(
  email: string,
  password: string,
): Promise<VerifyOtpResponse> {
  await wakeApi();
  const { data } = await api.post<VerifyOtpResponse>('/auth/login', { email, password });
  return data;
}

export async function deleteAccount(): Promise<{ ok: boolean }> {
  const { data } = await api.delete<{ ok: boolean }>('/auth/me');
  return data;
}

export async function getMe(): Promise<{ user: AuthUser }> {
  const { data } = await api.get<{ user: AuthUser }>('/auth/me');
  return data;
}
