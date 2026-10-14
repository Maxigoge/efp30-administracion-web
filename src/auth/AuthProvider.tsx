import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { ApiRequestError } from "../api/errors";
import { setUnauthorizedHandler } from "../api/client";
import type { SessionUser } from "../api/types";
import * as authService from "./service";

interface AuthContextValue {
  user: SessionUser | null;
  loading: boolean;
  restoreError: string | null;
  signIn(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
  retryRestore(): void;
}
const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [restoreError, setRestoreError] = useState<string | null>(null);

  const restore = useCallback(async () => {
    setLoading(true);
    setRestoreError(null);
    try {
      const restored = await authService.restoreSession();
      setUser(restored);
    } catch (error) {
      setUser(null);
      if (!(error instanceof ApiRequestError) || error.failure.kind !== "unauthorized") {
        setRestoreError(error instanceof Error ? error.message : "No se pudo consultar la sesión.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setUser(null);
      setLoading(false);
    });
    void restore();
    return () => setUnauthorizedHandler(undefined);
  }, [restore]);

  const signIn = useCallback(async (email: string, password: string) => {
    setRestoreError(null);
    const sessionUser = await authService.login({ email, password });
    setUser(sessionUser);
  }, []);

  const signOut = useCallback(async () => {
    await authService.logout();
    setUser(null);
  }, []);

  const value = useMemo(() => ({
    user, loading, restoreError, signIn, signOut, retryRestore: () => { void restore(); },
  }), [user, loading, restoreError, signIn, signOut, restore]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth debe usarse dentro de AuthProvider.");
  return value;
}
