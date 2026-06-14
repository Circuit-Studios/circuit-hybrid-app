import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { appConfig } from '@/config/appEnv';
import { storage } from '@/lib/storage';

const PUBLIC_AUTH_PATHS = ['/auth/login', '/auth/request-otp', '/auth/verify-otp'];

export const API_BASE_URL = appConfig.apiBaseUrl;

const API_TIMEOUT_MS = API_BASE_URL.includes('onrender.com') ? 120_000 : 30_000;

if (__DEV__) {
  console.log('[api] baseURL:', API_BASE_URL, 'timeoutMs:', API_TIMEOUT_MS);
}

let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(handler: () => void): void {
  onUnauthorized = handler;
}

export const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT_MS,
  headers: { 'Content-Type': 'application/json' },
});

/** Best-effort ping so Render free tier is awake before a user-facing auth call. */
export async function wakeApi(): Promise<void> {
  try {
    await api.get('/health', { timeout: API_TIMEOUT_MS });
  } catch {
    // Non-fatal — the follow-up request may still succeed once the service is up.
  }
}

api.interceptors.request.use(async config => {
  const token = await storage.getToken();
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
    void storage.touchActivity();
  }
  return config;
});

function isPublicAuthRequest(config: InternalAxiosRequestConfig | undefined): boolean {
  const url = config?.url ?? '';
  return PUBLIC_AUTH_PATHS.some(path => url.includes(path));
}

function requestHadAuthHeader(config: InternalAxiosRequestConfig | undefined): boolean {
  const auth = config?.headers?.Authorization ?? config?.headers?.authorization;
  return typeof auth === 'string' && auth.length > 0;
}

/** Exported for tests — only sign out when an authenticated request gets 401. */
export function shouldSignOutOn401(config: InternalAxiosRequestConfig | undefined): boolean {
  if (!config) return false;
  if (isPublicAuthRequest(config)) return false;
  return requestHadAuthHeader(config);
}

api.interceptors.response.use(
  res => res,
  (err: AxiosError) => {
    if (err.response?.status === 401 && shouldSignOutOn401(err.config)) {
      onUnauthorized?.();
    }
    return Promise.reject(err);
  },
);

export interface APIErrorBody {
  error?: { message?: string; details?: unknown };
  message?: string;
}

export function readApiError(err: unknown, fallback = 'Something went wrong'): string {
  if (axios.isAxiosError(err)) {
    if (!err.response) {
      if (err.code === 'ECONNABORTED') {
        return `API at ${API_BASE_URL} timed out (server may be waking up). Wait a moment and try again.`;
      }
      return `Cannot reach API at ${API_BASE_URL}. Check your network or VPN, then reload the app (⌘R).`;
    }
    const data = err.response?.data as APIErrorBody | undefined;
    return data?.error?.message ?? data?.message ?? err.message ?? fallback;
  }
  if (err instanceof Error) return err.message;
  return fallback;
}
