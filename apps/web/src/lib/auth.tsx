import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, refresh, setAccessToken } from './api';

export interface User { id: string; username: string; email: string; role: 'user' | 'setter' | 'admin'; rating: number; solvedCount: number }
interface AuthCtx {
  user: User | null;
  ready: boolean;
  login(username: string, password: string): Promise<void>;
  register(username: string, email: string, password: string): Promise<void>;
  logout(): Promise<void>;
}
const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  // on load, try the refresh cookie once. no cookie => signed out, no error shown.
  useEffect(() => {
    (async () => {
      if (await refresh()) {
        const r = await api<{ user: User }>('GET', '/api/auth/me').catch(() => null);
        setUser(r?.user ?? null);
      }
      setReady(true);
    })();
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const r = await api<{ accessToken: string; user: User }>('POST', '/api/auth/login', { username, password });
    setAccessToken(r.accessToken); setUser(r.user);
  }, []);
  const register = useCallback(async (username: string, email: string, password: string) => {
    const r = await api<{ accessToken: string; user: User }>('POST', '/api/auth/register', { username, email, password });
    setAccessToken(r.accessToken); setUser(r.user);
  }, []);
  const logout = useCallback(async () => {
    await api('POST', '/api/auth/logout').catch(() => undefined);
    setAccessToken(null); setUser(null);
  }, []);

  const value = useMemo(() => ({ user, ready, login, register, logout }), [user, ready, login, register, logout]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useAuth outside AuthProvider');
  return c;
}
