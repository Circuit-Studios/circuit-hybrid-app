import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { appConfig } from '@/config/appEnv';
import { logger, logApiRequest, logApiResponse } from '@/lib/logger';
import { readResponseRequestId, withRequestId } from '@/lib/requestId';
import { storage } from '@/lib/storage';

const PUBLIC_AUTH_PATHS = ['/auth/login', '/auth/request-otp', '/auth/verify-otp', '/app/config'];

interface RequestMetadata {
  startTime: number;
  method: string;
  url: string;
  requestId: string;
}

declare module 'axios' {
  export interface InternalAxiosRequestConfig {
    circuitMeta?: RequestMetadata;
  }
}

export const API_BASE_URL = appConfig.apiBaseUrl;

const API_TIMEOUT_MS = API_BASE_URL.includes('onrender.com') ? 120_000 : 30_000;

logger.info('api client ready', { baseURL: API_BASE_URL, timeoutMs: API_TIMEOUT_MS });

function formatRequestUrl(config: InternalAxiosRequestConfig): string {
  const path = config.url ?? '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const base = (config.baseURL ?? '').replace(/\/$/, '');
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
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
  if (!API_BASE_URL.includes('onrender.com')) return;
  try {
    await api.get('/health', { timeout: API_TIMEOUT_MS });
  } catch {
    // Non-fatal — the follow-up request may still succeed once the service is up.
  }
}

let authToken: string | null = null;

export function setAuthToken(token: string | null): void {
  authToken = token;
}

api.interceptors.request.use(async config => {
  config.headers = config.headers ?? {};
  const { requestId, headers: idHeaders } = withRequestId();
  for (const [key, value] of Object.entries(idHeaders)) {
    config.headers[key] = value;
  }

  const token = authToken ?? (await storage.getToken());
  if (token) {
    authToken = token;
    config.headers.Authorization = `Bearer ${token}`;
  }

  const method = (config.method ?? 'get').toUpperCase();
  const url = formatRequestUrl(config);
  config.circuitMeta = {
    startTime: logApiRequest(method, url, requestId),
    method,
    url,
    requestId,
  };

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

function logTrackedResponse(
  meta: RequestMetadata,
  status: number | string,
  headers: Record<string, unknown> | undefined,
): void {
  const requestId = readResponseRequestId(headers) ?? meta.requestId;
  logApiResponse(meta.method, meta.url, status, meta.startTime, requestId);
}

api.interceptors.response.use(
  res => {
    if (res.config.circuitMeta) {
      logTrackedResponse(
        res.config.circuitMeta,
        res.status,
        res.headers as Record<string, unknown>,
      );
    }
    return res;
  },
  (err: AxiosError) => {
    if (err.config?.circuitMeta) {
      logTrackedResponse(
        err.config.circuitMeta,
        err.response?.status ?? err.code ?? 'ERR',
        err.response?.headers as Record<string, unknown> | undefined,
      );
    }
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
