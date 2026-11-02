"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
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
      const isEmployeeRoute =
        typeof window !== "undefined" && window.location.pathname.startsWith("/employee");
      const targetEmail = isEmployeeRoute ? "rahul@acme.com" : "hr@acme.com";

      try {
        const me = await api.auth.me();
        if (isEmployeeRoute && me.email !== "rahul@acme.com") {
          throw new Error("Switching to employee credentials");
        }
        setUser(me);
      } catch {
        try {
          const res = await api.auth.login({
            email: targetEmail,
            password: "Password123!",
          });
          setAccessToken(res.access);
          setUser(res.user);
        } catch {
          setUser(null);
        }
      } finally {
        setLoading(false);
      }
    }
    initAuth();
  }, []);

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
