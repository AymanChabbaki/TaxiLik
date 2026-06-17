import React, { createContext, useContext, useEffect, useMemo, useState, useCallback, useRef } from 'react';

import { API_BASE_URL, ApiError, apiRequest } from './api';
import { storage, TOKEN_KEY, REFRESH_KEY } from './storage';
import type { Role, User } from './types';
import { Platform } from 'react-native';

interface AuthState {
  token: string | null;
  user: User | null;
  loading: boolean; // initial bootstrap from storage
}

export interface RegisterInput {
  email: string;
  password: string;
  fullName?: string;
  phone?: string;
  role?: Role;
}

interface AuthContextValue extends AuthState {
  register: (data: RegisterInput) => Promise<{ email: string }>;
  verifyEmail: (email: string, code: string) => Promise<{ user: User }>;
  login: (email: string, password: string) => Promise<{ user: User }>;
  resendOtp: (email: string) => Promise<void>;
  refreshUser: () => Promise<void>;
  updateProfile: (data: { fullName?: string; phone?: string }) => Promise<void>;
  uploadAvatar: (file: { uri: string; name: string; type: string }) => Promise<void>;
  deleteAccount: () => Promise<void>;
  setUser: (u: User) => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// Access token lives ~15 min; refresh proactively before it expires.
const REFRESH_INTERVAL_MS = 12 * 60 * 1000;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const refreshTokenRef = useRef<string | null>(null);

  const persistTokens = useCallback(async (access: string, refresh: string) => {
    refreshTokenRef.current = refresh;
    setToken(access);
    await storage.set(TOKEN_KEY, access);
    await storage.set(REFRESH_KEY, refresh);
  }, []);

  const clearTokens = useCallback(async () => {
    refreshTokenRef.current = null;
    setToken(null);
    setUser(null);
    await storage.remove(TOKEN_KEY);
    await storage.remove(REFRESH_KEY);
  }, []);

  // Exchange the refresh token for a fresh access + rotated refresh token.
  const doRefresh = useCallback(async (): Promise<User | null> => {
    const rt = refreshTokenRef.current;
    if (!rt) return null;
    try {
      const res = await apiRequest<{ token: string; refreshToken: string; user: User }>(
        '/api/auth/refresh',
        { method: 'POST', body: { refreshToken: rt } }
      );
      await persistTokens(res.token, res.refreshToken);
      setUser(res.user);
      return res.user;
    } catch {
      return null;
    }
  }, [persistTokens]);

  // Bootstrap: restore tokens, refresh the access token, load the user.
  useEffect(() => {
    (async () => {
      try {
        const [savedToken, savedRefresh] = await Promise.all([
          storage.get(TOKEN_KEY),
          storage.get(REFRESH_KEY),
        ]);
        refreshTokenRef.current = savedRefresh;
        if (savedRefresh) {
          const u = await doRefresh();
          if (u) return; // refreshed + user set
        }
        if (savedToken) {
          // No refresh token (legacy) — try the access token directly.
          setToken(savedToken);
          const { user } = await apiRequest<{ user: User }>('/api/auth/me', { token: savedToken });
          setUser(user);
          return;
        }
        await clearTokens();
      } catch {
        await clearTokens();
      } finally {
        setLoading(false);
      }
    })();
  }, [doRefresh, clearTokens]);

  // Proactive refresh while signed in.
  useEffect(() => {
    if (!token) return;
    const id = setInterval(() => {
      doRefresh();
    }, REFRESH_INTERVAL_MS);
    return () => clearInterval(id);
  }, [token, doRefresh]);


  
  const register = useCallback(async (data: RegisterInput) => {
    return apiRequest<{ email: string }>('/api/auth/register', { method: 'POST', body: data });
  }, []);

  const verifyEmail = useCallback(
    async (email: string, code: string) => {
      const res = await apiRequest<{ token: string; refreshToken: string; user: User }>(
        '/api/auth/verify-email',
        { method: 'POST', body: { email, code } }
      );
      await persistTokens(res.token, res.refreshToken);
      setUser(res.user);
      return { user: res.user };
    },
    [persistTokens]
  );

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await apiRequest<{ token: string; refreshToken: string; user: User }>(
        '/api/auth/login',
        { method: 'POST', body: { email, password } }
      );
      await persistTokens(res.token, res.refreshToken);
      setUser(res.user);
      return { user: res.user };
    },
    [persistTokens]
  );

  const resendOtp = useCallback(async (email: string) => {
    await apiRequest('/api/auth/resend-otp', { method: 'POST', body: { email } });
  }, []);

  const refreshUser = useCallback(async () => {
    if (!token) return;
    const { user } = await apiRequest<{ user: User }>('/api/auth/me', { token });
    setUser(user);
  }, [token]);

  const updateProfile = useCallback(
    async (data: { fullName?: string; phone?: string }) => {
      const { user } = await apiRequest<{ user: User }>('/api/auth/me', {
        method: 'PATCH',
        token,
        body: data,
      });
      setUser(user);
    },
    [token]
  );

  const uploadAvatar = useCallback(
    async (file: { uri: string; name: string; type: string }) => {
      const form = new FormData();
      if (Platform.OS === 'web') {
        const blob = await (await fetch(file.uri)).blob();
        form.append('file', blob, file.name);
      } else {
        form.append('file', file as any);
      }
      const res = await fetch(`${API_BASE_URL}/api/auth/avatar`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new ApiError(res.status, data?.error || 'Upload failed');
      setUser(data.user);
    },
    [token]
  );

  const deleteAccount = useCallback(async () => {
    await apiRequest('/api/auth/me', { method: 'DELETE', token });
    await clearTokens();
  }, [token, clearTokens]);

  const signOut = useCallback(async () => {
    const rt = refreshTokenRef.current;
    if (rt) {
      apiRequest('/api/auth/logout', { method: 'POST', body: { refreshToken: rt } }).catch(() => {});
    }
    await clearTokens();
  }, [clearTokens]);

  const value = useMemo<AuthContextValue>(
    () => ({
      token,
      user,
      loading,
      register,
      verifyEmail,
      login,
      resendOtp,
      refreshUser,
      updateProfile,
      uploadAvatar,
      deleteAccount,
      setUser,
      signOut,
    }),
    [token, user, loading, register, verifyEmail, login, resendOtp, refreshUser, updateProfile, uploadAvatar, deleteAccount, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
