"use client";

import React, { useEffect } from "react";
import { EmployeeSidebar } from "@/components/shell/EmployeeSidebar";
import { TopBar } from "@/components/shell/TopBar";
import { Breadcrumbs } from "@/components/shell/Breadcrumbs";
import { useAuth } from "@/lib/auth/AuthContext";
import { api, setAccessToken } from "@/lib/api/client";

export default function EmployeeLayout({
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

  if (!user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50 p-6">
        <div className="flex flex-col items-center space-y-4 max-w-md text-center p-8 bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center">
            TP
          </div>
          <h2 className="text-base font-bold text-slate-900">Backend Connection Error</h2>
          <p className="text-xs text-slate-500">
            Could not authenticate with the TalentPulse backend. Please verify that the backend is running on http://127.0.0.1:8000.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded-md bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-colors"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50/50">
      {/* 13-item Employee Sidebar */}
      <EmployeeSidebar />

      {/* Main Content */}
      <div className="flex flex-col flex-1 min-w-0">
        <TopBar />
        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto">
          <Breadcrumbs />
          {children}
        </main>
      </div>
    </div>
  );
}
