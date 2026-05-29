import React, { createContext, useEffect, useContext, useMemo, useState } from 'react';
import { logoutUser } from '../api/authApi';
import { getMyProfile } from '../api/userApi';
import { ApiError } from '../lib/errors';
import { AUTH_EXPIRED_EVENT, AUTH_REFRESHED_EVENT } from '../notifications/events';
import {
  type AuthSession,
  type AuthUser,
  type UserRole,
  clearStoredSession,
  getStoredSession,
  setStoredSession,
} from './storage';

type AuthContextValue = {
  session: AuthSession | null;
  user: AuthUser | null;
  role: UserRole | null;
  isAuthReady: boolean;
  isAuthenticated: boolean;
  setSession: (session: AuthSession) => void;
  updateUser: (user: AuthUser) => void;
  logout: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSessionState] = useState<AuthSession | null>(() => getStoredSession());
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    const handleAuthExpired = () => {
      clearStoredSession();
      setSessionState(null);
      setIsAuthReady(true);
    };

    const handleAuthRefreshed = (e: Event) => {
      const customEvent = e as CustomEvent<{ session: AuthSession }>;
      if (customEvent.detail?.session) {
        setSessionState(customEvent.detail.session);
      }
    };

    window.addEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired as EventListener);
    window.addEventListener(AUTH_REFRESHED_EVENT, handleAuthRefreshed as EventListener);

    return () => {
      window.removeEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired as EventListener);
      window.removeEventListener(AUTH_REFRESHED_EVENT, handleAuthRefreshed as EventListener);
    };
  }, []);

  useEffect(() => {
    import('../lib/echo').then(({ updateEchoAuth }) => {
      updateEchoAuth(session?.token || null);
    });
  }, [session?.token]);

  useEffect(() => {
    let isMounted = true;

    const verifyStoredSession = async () => {
      const storedSession = getStoredSession();

      if (!storedSession?.token) {
        if (isMounted) {
          setSessionState(null);
          setIsAuthReady(true);
        }

        return;
      }

      try {
        const profile = await getMyProfile();
        const nextSession: AuthSession = {
          ...storedSession,
          role: profile.role,
          user: profile.user,
        };

        setStoredSession(nextSession);

        if (isMounted) {
          setSessionState(nextSession);
        }
      } catch (error: unknown) {
        if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
          clearStoredSession();

          if (isMounted) {
            setSessionState(null);
          }

          return;
        }

        if (isMounted) {
          setSessionState(storedSession);
        }
      } finally {
        if (isMounted) {
          setIsAuthReady(true);
        }
      }
    };

    void verifyStoredSession();

    return () => {
      isMounted = false;
    };
  }, []);

  const setSession = (nextSession: AuthSession) => {
    setStoredSession(nextSession);
    setSessionState(nextSession);
    setIsAuthReady(true);
    sessionStorage.removeItem('dismissed_checkin_today');
  };

  const updateUser = (user: AuthUser) => {
    setSessionState((current) => {
      if (!current) {
        return current;
      }

      const nextSession = {
        ...current,
        user,
      };

      setStoredSession(nextSession);
      return nextSession;
    });
  };

  const logout = async () => {
    try {
      if (session?.token) {
        await logoutUser();
      }
    } catch {
      // Clearing local session is still correct if the backend token is already invalid.
    } finally {
      clearStoredSession();
      setSessionState(null);
      setIsAuthReady(true);
      sessionStorage.removeItem('dismissed_checkin_today');
    }
  };
  
  const hasPermission = React.useCallback(
    (permission: string) => {
      if (session?.role === 'admin') return true;
      if (!session?.user?.permissions) return false;
      return session.user.permissions.includes(permission);
    },
    [session]
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      role: session?.role ?? null,
      isAuthReady,
      isAuthenticated: Boolean(session?.token),
      setSession,
      updateUser,
      logout,
      hasPermission,
    }),
    [isAuthReady, session, hasPermission]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
}
