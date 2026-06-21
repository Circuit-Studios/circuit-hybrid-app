// Thin wrapper around expo-secure-store for auth credentials.
// Falls back to in-memory storage on web (SecureStore is iOS/Android-only).

import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// SecureStore on iOS only accepts [A-Za-z0-9._-] in keys. Earlier versions of
// this file used `circuit:auth_*` which silently throws on iOS — keep dots.
const TOKEN_KEY = 'circuit.auth_token';
const USER_KEY = 'circuit.auth_user';
const EXPIRES_KEY = 'circuit.auth_expires_at';
const ACTIVITY_KEY = 'circuit.auth_last_activity';

const TOUCH_DEBOUNCE_MS = 30_000;
let lastTouchWriteMs = 0;

const memory = new Map<string, string>();

async function setItem(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    memory.set(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function getItem(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    return memory.get(key) ?? null;
  }
  return SecureStore.getItemAsync(key);
}

async function removeItem(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    memory.delete(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

export interface StoredUser {
  id: string;
  phone: string | null;
  email: string | null;
  firstName: string;
  lastName: string;
  defaultRole: string;
}

function normalizeStoredUser(raw: StoredUser & { name?: string }): StoredUser {
  if (raw.firstName != null && raw.lastName != null) {
    return {
      id: raw.id,
      phone: raw.phone,
      email: raw.email,
      firstName: raw.firstName,
      lastName: raw.lastName,
      defaultRole: raw.defaultRole,
    };
  }
  if (raw.name) {
    const parts = raw.name.trim().split(/\s+/).filter(Boolean);
    return {
      id: raw.id,
      phone: raw.phone,
      email: raw.email,
      firstName: parts[0] ?? '',
      lastName: parts.slice(1).join(' '),
      defaultRole: raw.defaultRole,
    };
  }
  return {
    id: raw.id,
    phone: raw.phone,
    email: raw.email,
    firstName: '',
    lastName: '',
    defaultRole: raw.defaultRole,
  };
}

export const storage = {
  async saveSession(
    token: string,
    user: StoredUser,
    expiresAtMs: number,
  ): Promise<void> {
    const now = String(Date.now());
    lastTouchWriteMs = Date.now();
    await Promise.all([
      setItem(TOKEN_KEY, token),
      setItem(USER_KEY, JSON.stringify(user)),
      setItem(EXPIRES_KEY, String(expiresAtMs)),
      setItem(ACTIVITY_KEY, now),
    ]);
  },
  async loadSession(): Promise<{ token: string; user: StoredUser; expiresAtMs: number } | null> {
    const [token, userJson, expiresRaw] = await Promise.all([
      getItem(TOKEN_KEY),
      getItem(USER_KEY),
      getItem(EXPIRES_KEY),
    ]);
    if (!token || !userJson) return null;
    try {
      const expiresAtMs = expiresRaw ? Number(expiresRaw) : NaN;
      return {
        token,
        user: normalizeStoredUser(JSON.parse(userJson) as StoredUser & { name?: string }),
        expiresAtMs: Number.isFinite(expiresAtMs) ? expiresAtMs : 0,
      };
    } catch {
      return null;
    }
  },
  async clearSession(): Promise<void> {
    lastTouchWriteMs = 0;
    await Promise.all([
      removeItem(TOKEN_KEY),
      removeItem(USER_KEY),
      removeItem(EXPIRES_KEY),
      removeItem(ACTIVITY_KEY),
    ]);
  },
/** Persists last user interaction time — not called from API/network code. */
  async touchActivity(atMs = Date.now()): Promise<void> {
    if (atMs - lastTouchWriteMs < TOUCH_DEBOUNCE_MS) return;
    lastTouchWriteMs = atMs;
    await setItem(ACTIVITY_KEY, String(atMs));
  },
  async getLastActivityAtMs(): Promise<number | null> {
    const raw = await getItem(ACTIVITY_KEY);
    if (!raw) return null;
    const value = Number(raw);
    return Number.isFinite(value) ? value : null;
  },
  async getToken(): Promise<string | null> {
    return getItem(TOKEN_KEY);
  },
  async getExpiresAtMs(): Promise<number | null> {
    const raw = await getItem(EXPIRES_KEY);
    if (!raw) return null;
    const value = Number(raw);
    return Number.isFinite(value) ? value : null;
  },
};
