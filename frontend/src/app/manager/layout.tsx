"use client";

import React from "react";
import { ManagerSidebar } from "@/components/shell/ManagerSidebar";
import { ManagerTopBar } from "@/components/shell/ManagerTopBar";
import { Breadcrumbs } from "@/components/shell/Breadcrumbs";
import { PortalGuard } from "@/components/auth/PortalGuard";

export default function ManagerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PortalGuard allowedRoles={["MANAGER", "HR_ADMIN"]}>
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
    </PortalGuard>
  );
}
