"use client";

import React from "react";
import { ExecutiveSidebar } from "@/components/shell/ExecutiveSidebar";
import { TopBar } from "@/components/shell/TopBar";
import { Breadcrumbs } from "@/components/shell/Breadcrumbs";
import { PortalGuard } from "@/components/auth/PortalGuard";

export default function ExecutiveLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PortalGuard allowedRoles={["EXECUTIVE"]}>
      <div className="flex min-h-screen bg-slate-50/50">
        {/* 5-item Executive Sidebar */}
        <ExecutiveSidebar />

        {/* Main Content */}
        <div className="flex flex-col flex-1 min-w-0">
          <TopBar />
          <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto">
            <Breadcrumbs />
            {children}
          </main>
        </div>
      </div>
    </PortalGuard>
  );
}
