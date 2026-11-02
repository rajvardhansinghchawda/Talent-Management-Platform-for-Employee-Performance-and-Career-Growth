"use client";

import React from "react";
import { EmployeeSidebar } from "@/components/shell/EmployeeSidebar";
import { TopBar } from "@/components/shell/TopBar";
import { Breadcrumbs } from "@/components/shell/Breadcrumbs";
import { PortalGuard } from "@/components/auth/PortalGuard";

export default function EmployeeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PortalGuard allowedRoles={["EMPLOYEE"]}>
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
    </PortalGuard>
  );
}
