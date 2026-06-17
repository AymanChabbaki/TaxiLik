import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Resolve the backend base URL.
 * On a device/emulator, `localhost` points at the device itself, so we reuse
 * the LAN IP of the Metro dev server (Expo `hostUri`) and target port 5000.
 * Override anytime with EXPO_PUBLIC_API_URL.
 */
function resolveBaseUrl(): string {
  const explicit = process.env.EXPO_PUBLIC_API_URL;
  if (explicit) return explicit.replace(/\/$/, '');

  if (Platform.OS === 'web') return 'http://localhost:5000';

  const hostUri =
    Constants.expoConfig?.hostUri ||
    (Constants as any).manifest2?.extra?.expoGo?.developer?.host ||
    '';
  const host = hostUri.split(':')[0];
  if (host) return `http://${host}:5000`;

  return 'http://localhost:5000';
}

export const API_BASE_URL = resolveBaseUrl();

export class ApiError extends Error {
  status: number;
  details?: unknown;
  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  token?: string | null;
  signal?: AbortSignal;
};

export async function apiRequest<T = any>(
  path: string,
  { method = 'GET', body, token, signal }: RequestOptions = {}
): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body != null ? JSON.stringify(body) : undefined,
    signal,
  });

  const text = await res.text();
  const data = text ? JSON.parse(text) : {};

  if (!res.ok) {
    throw new ApiError(res.status, data?.error || `Request failed (${res.status})`, data?.details);
  }
  return data as T;
}
