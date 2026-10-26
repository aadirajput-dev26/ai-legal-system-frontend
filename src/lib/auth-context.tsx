'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { auth as authApi } from '@/lib/api';

interface User {
  id: string;
  name: string;
  email: string;
}

export interface SignupPayload {
  name: string;
  email: string;
  password: string;
  accountType?: string;
  mobile?: string;
  state?: string;
  city?: string;
  firmName?: string;
  gstin?: string;
}

export type GoogleLoginParams = string | {
  accessToken?: string;
  credential?: string;
  accountType?: string;
  firmName?: string;
};

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (payload: SignupPayload | string, email?: string, password?: string) => Promise<void>;
  googleLogin: (params: GoogleLoginParams) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setLoading(false);
        return;
      }
      const res = await authApi.me();
      setUser(res.data || res);
    } catch {
      localStorage.removeItem('accessToken');
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const login = async (email: string, password: string) => {
    const res = await authApi.login({ email, password });
    localStorage.setItem('accessToken', res.data.accessToken);
    setUser(res.data.user);
  };

  const signup = async (payload: SignupPayload | string, emailParam?: string, passwordParam?: string) => {
    const body: SignupPayload = typeof payload === 'string'
      ? { name: payload, email: emailParam || '', password: passwordParam || '' }
      : payload;

    await authApi.signup(body);
    await login(body.email, body.password);
  };

  const googleLogin = async (params: GoogleLoginParams) => {
    const res = await authApi.googleAuth(params);
    localStorage.setItem('accessToken', res.data.accessToken);
    setUser(res.data.user);
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch { /* ignore */ }
    localStorage.removeItem('accessToken');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, googleLogin, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
