"use client";

import React, { useEffect } from "react";
import { ManagerSidebar } from "@/components/shell/ManagerSidebar";
import { ManagerTopBar } from "@/components/shell/ManagerTopBar";
import { Breadcrumbs } from "@/components/shell/Breadcrumbs";
import { useAuth } from "@/lib/auth/AuthContext";
import { api, setAccessToken } from "@/lib/api/client";

export default function ManagerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, refreshUser } = useAuth();

  useEffect(() => {
    // If not logged in as manager, authenticate as demo manager
    async function ensureManager() {
      if (!user || user.role !== "MANAGER") {
        try {
          const res = await api.auth.login({
            email: "manager@acme.com",
            password: "Password123!",
          });
          setAccessToken(res.access);
          await refreshUser();
        } catch {}
      }
    }
    ensureManager();
  }, [user]);

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 animate-pulse flex items-center justify-center text-white font-bold">
            TP
          </div>
          <p className="text-sm text-slate-500 font-medium">Loading Manager Workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50/50">
      {/* 9-item Left Vertical Manager Sidebar */}
      <ManagerSidebar />

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 min-w-0">
        <ManagerTopBar />
        <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-7xl w-full mx-auto min-w-0 overflow-x-hidden">
          <Breadcrumbs />
          {children}
        </main>
      </div>
    </div>
  );
}
