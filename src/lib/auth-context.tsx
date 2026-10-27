import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { getSessionFn, signOutFn } from "@/server/auth.functions";

export type AuthUser = { id: string; email: string; name: string | null };

type AuthState = {
  user: AuthUser | null;
  loading: boolean;
  isAdmin: boolean;
  /** Recarrega a sessão (use após login/cadastro). */
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthState>({
  user: null,
  loading: true,
  isAdmin: false,
  refresh: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const s = await getSessionFn();
      setUser(s.user);
      setIsAdmin(s.is_admin);
    } catch {
      setUser(null);
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const signOut = useCallback(async () => {
    try {
      await signOutFn();
    } finally {
      setUser(null);
      setIsAdmin(false);
    }
  }, []);

  return (
    <Ctx.Provider value={{ user, loading, isAdmin, refresh, signOut }}>{children}</Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
