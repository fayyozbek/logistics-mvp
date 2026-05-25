import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { fetchMe, login as loginRequest, logout as logoutRequest } from '../api/auth';
import { ApiError, isApiConfigured, setForbiddenHandler, setUnauthorizedHandler } from '../api/client';
import { clearAuthToken, getAuthToken, setAuthToken } from '../auth/token';
import type { AuthUser } from '../types/auth';

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

interface AuthContextValue {
  status: AuthStatus;
  user: AuthUser | null;
  authRequired: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  forbiddenMessage: string | null;
  clearForbiddenMessage: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const authRequired = isApiConfigured();
  const [status, setStatus] = useState<AuthStatus>(authRequired ? 'loading' : 'authenticated');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [forbiddenMessage, setForbiddenMessage] = useState<string | null>(null);

  const handleUnauthorized = useCallback(() => {
    setUser(null);
    setStatus('unauthenticated');
  }, []);

  const clearForbiddenMessage = useCallback(() => {
    setForbiddenMessage(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(handleUnauthorized);
    setForbiddenHandler((message) => setForbiddenMessage(message));

    return () => {
      setUnauthorizedHandler(null);
      setForbiddenHandler(null);
    };
  }, [handleUnauthorized]);

  useEffect(() => {
    if (!authRequired) {
      setStatus('authenticated');
      setUser(null);
      return;
    }

    const token = getAuthToken();
    if (!token) {
      setStatus('unauthenticated');
      setUser(null);
      return;
    }

    let cancelled = false;

    fetchMe()
      .then(({ user: me }) => {
        if (!cancelled) {
          setUser(me);
          setStatus('authenticated');
        }
      })
      .catch(() => {
        if (!cancelled) {
          clearAuthToken();
          setUser(null);
          setStatus('unauthenticated');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [authRequired]);

  const login = useCallback(async (email: string, password: string) => {
    const { token, user: loggedInUser } = await loginRequest(email, password);
    setAuthToken(token);
    setUser(loggedInUser);
    setStatus('authenticated');
    setForbiddenMessage(null);
  }, []);

  const logout = useCallback(async () => {
    try {
      if (getAuthToken()) {
        await logoutRequest();
      }
    } catch (error) {
      if (!(error instanceof ApiError) || error.status !== 401) {
        // Best-effort logout — still clear local session
      }
    } finally {
      clearAuthToken();
      setUser(null);
      setStatus('unauthenticated');
      setForbiddenMessage(null);
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      authRequired,
      login,
      logout,
      forbiddenMessage,
      clearForbiddenMessage,
    }),
    [status, user, authRequired, login, logout, forbiddenMessage, clearForbiddenMessage],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
