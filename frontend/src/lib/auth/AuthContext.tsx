"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { api, getAccessToken, setAccessToken } from "../api/client";
import type { User } from "../api/types";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();
  const queryClient = useQueryClient();

  const refreshUser = async () => {
    try {
      const me = await api.auth.me();
      setUser(me);
    } catch {
      setUser(null);
    }
  };

  useEffect(() => {
    async function initAuth() {
      const isEmployeeRoute = pathname?.startsWith("/employee");
      const isManagerRoute = pathname?.startsWith("/manager");
      const isExecutiveRoute = pathname?.startsWith("/executive");
      const targetEmail = isEmployeeRoute
        ? "rahul@acme.com"
        : isManagerRoute
        ? "manager@acme.com"
        : isExecutiveRoute
        ? "exec@acme.com"
        : "hr@acme.com";

      if (user?.email === targetEmail && getAccessToken()) {
        setLoading(false);
        return;
      }

      console.log("[AuthContext] initAuth switching to:", targetEmail);

      try {
        const res = await api.auth.login({
          email: targetEmail,
          password: "Password123!",
        });
        console.log("[AuthContext] login succeeded for:", res.user.email);
        setAccessToken(res.access);
        setUser(res.user);
        queryClient.invalidateQueries();
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error("[AuthContext] login failed:", msg);
        setUser(null);
      } finally {
        setLoading(false);
      }
    }
    initAuth();
  }, [pathname]);

  const login = async (email: string, password: string): Promise<User> => {
    const res = await api.auth.login({ email, password });
    setAccessToken(res.access);
    setUser(res.user);
    return res.user;
  };

  const logout = async () => {
    try {
      await api.auth.logout();
    } finally {
      setAccessToken(null);
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
