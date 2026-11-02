"use client";

import React from "react";
import { Sidebar } from "@/components/shell/Sidebar";
import { TopBar } from "@/components/shell/TopBar";
import { Breadcrumbs } from "@/components/shell/Breadcrumbs";
import { PortalGuard } from "@/components/auth/PortalGuard";

export default function HrLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PortalGuard allowedRoles={["HR_ADMIN"]}>
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
    </PortalGuard>
  );
}
