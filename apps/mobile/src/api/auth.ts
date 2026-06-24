import { api, wakeApi } from './client';
import type { UserRole, VerifyOtpResponse, AuthUser } from './types';

export type AuthSessionResponse = VerifyOtpResponse;

export type OtpPurpose = 'signup' | 'login' | 'verify_email' | 'password_reset';
export type OtpChannel = 'PHONE' | 'EMAIL';

export type RequestOtpInput =
  | { channel: 'EMAIL'; email: string; purpose?: OtpPurpose }
  | { channel: 'PHONE'; phone: string; purpose?: OtpPurpose };

/** Post-account email verification via unified /auth OTP routes. */
export async function sendEmailVerificationOtp(
  email: string,
  purpose: 'verify_email' = 'verify_email',
): Promise<{ ok: boolean; message: string; ttlSeconds: number }> {
  await wakeApi();
  const { data } = await api.post<{ ok: boolean; message: string; ttlSeconds: number }>(
    '/auth/request-otp',
    { channel: 'EMAIL', email, purpose },
  );
  return data;
}

/** Confirm post-account email verification via unified /auth OTP routes. */
export async function verifyEmailVerificationOtp(
  email: string,
  code: string,
  purpose: 'verify_email' = 'verify_email',
): Promise<{ ok: boolean; message: string; emailVerified: boolean }> {
  const { data } = await api.post<{
    ok: boolean;
    message: string;
    emailVerified: boolean;
  }>('/auth/verify-otp', { channel: 'EMAIL', email, code, purpose });
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
        password: string;
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
        password: string;
        email?: string;
      };
    };

export async function verifyOtp(input: VerifyOtpInput): Promise<VerifyOtpResponse> {
  const { data } = await api.post<VerifyOtpResponse>('/auth/verify-otp', input);
  return data;
}

/** Trigger a password-reset OTP to a registered email. Always resolves generically. */
export async function requestPasswordReset(
  email: string,
): Promise<{ ok: boolean; message: string; ttlSeconds: number; cooldownSeconds: number }> {
  await wakeApi();
  const { data } = await api.post<{
    ok: boolean;
    message: string;
    ttlSeconds: number;
    cooldownSeconds: number;
  }>('/auth/forgot-password', { email });
  return data;
}

/** Confirm a password-reset OTP and set a new password in one step. */
export async function resetPassword(
  email: string,
  code: string,
  newPassword: string,
): Promise<{ ok: boolean; message: string }> {
  const { data } = await api.post<{ ok: boolean; message: string }>('/auth/reset-password', {
    email,
    code,
    newPassword,
  });
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
