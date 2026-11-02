"use client";

import React from "react";
import { Sidebar } from "@/components/shell/Sidebar";
import { TopBar } from "@/components/shell/TopBar";
import { Breadcrumbs } from "@/components/shell/Breadcrumbs";
import { useAuth } from "@/lib/auth/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";

export default function HrLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 animate-pulse flex items-center justify-center text-white font-bold">
            TP
          </div>
          <p className="text-sm text-slate-500 font-medium">Connecting to TalentPulse backend...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50/50">
      {/* 12-item Left Vertical Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 min-w-0">
        <TopBar />
        <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-7xl w-full mx-auto min-w-0 overflow-x-hidden">
          <Breadcrumbs />
          {children}
        </main>
      </div>
    </div>
  );
}
