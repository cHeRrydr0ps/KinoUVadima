
import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type AuthUser = {
  id: number;
  name: string;
  email: string;
  role?: string | null;
  is_verified?: boolean;
  inn?: string | null;
};

type AuthContextType = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  loading: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  loading: true,
  refresh: async () => {},
  logout: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    try {
      const res = await fetch("/api/auth/me", { credentials: "include" });

      if (!res.ok) {
        setUser(null);
        return;
      }
      const data = await res.json();
      const next: AuthUser = {
        id: data?.id ?? data?.user?.id ?? 0,
        name: data?.name ?? data?.user?.name ?? "",
        email: data?.email ?? data?.user?.email ?? "",
        role: data?.role ?? data?.user?.role ?? null,
        is_verified: data?.is_verified ?? data?.user?.is_verified ?? undefined,
        inn: data?.inn ?? data?.user?.inn ?? null,
        subscriptionActive: data?.subscriptionActive ?? data?.user?.subscriptionActive ?? undefined,
      };
      setUser(next);

    } catch (e) {
      setUser(null);
    }
  };

  useEffect(() => {
    (async () => {
      await refresh();
      setLoading(false);

    })();
  }, []);

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    } catch {}
    setUser(null);
  };

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: !!user,
      loading,
      refresh,
      logout,
    }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
