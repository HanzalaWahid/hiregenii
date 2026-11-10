import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { apiJson, getAuthToken, setAuthToken } from "@/services/api";
import type { UserRole } from "@/types";

type User = {
  id: number;
  email: string;
  full_name: string;
  role: UserRole;
};

type AuthState = {
  user: User | null;
  isLoading: boolean;
  token: string | null;
  login: (token: string) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => getAuthToken());
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = async () => {
    const t = getAuthToken();
    setToken(t);
    if (!t) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      const me = await apiJson<User>("/auth/me");
      setUser(me);
    } catch {
      setAuthToken(null);
      setToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = async (newToken: string) => {
    setAuthToken(newToken);
    setToken(newToken);
    setIsLoading(true);
    await refresh();
  };

  const logout = () => {
    setAuthToken(null);
    setToken(null);
    setUser(null);
  };

  const value = useMemo<AuthState>(
    () => ({ user, isLoading, token, login, logout, refresh }),
    [user, isLoading, token]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

