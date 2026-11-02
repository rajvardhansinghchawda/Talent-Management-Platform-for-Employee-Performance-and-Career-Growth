"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import {
  LayoutDashboard,
  Target,
  FileText,
  Award,
  Compass,
  BookOpen,
  Briefcase,
  ListChecks,
  MessageSquare,
  Sparkles,
  Calendar,
  Users,
  User,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

const employeeNavItems = [
  { href: "/employee", label: "Dashboard", icon: LayoutDashboard },
  { href: "/employee/goals", label: "My Goals", icon: Target },
  { href: "/employee/reviews", label: "My Reviews", icon: FileText },
  { href: "/employee/skills", label: "My Skills", icon: Award },
  { href: "/employee/skill-gap", label: "Skill Gap", icon: Compass },
  { href: "/employee/learning", label: "Learning", icon: BookOpen },
  { href: "/employee/career", label: "Career", icon: Briefcase },
  { href: "/employee/development-plan", label: "Development Plan", icon: ListChecks },
  { href: "/employee/feedback", label: "Feedback", icon: MessageSquare },
  { href: "/employee/recognition", label: "Recognition", icon: Sparkles },
  { href: "/employee/one-on-ones", label: "1:1 Meetings", icon: Calendar },
  { href: "/employee/directory", label: "Directory", icon: Users },
  { href: "/employee/profile", label: "Profile", icon: User },
];

export function EmployeeSidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const { user } = useAuth();

  const displayName =
    (user as any)?.employee?.name ||
    (user as any)?.employee?.preferred_name ||
    (user?.first_name ? `${user.first_name} ${user.last_name || ""}`.trim() : null) ||
    (user?.email ? user.email.split("@")[0].replace(".", " ").replace(/\b\w/g, (c: string) => c.toUpperCase()) : "Employee");

  return (
    <aside
      className={cn(
        "sticky top-0 h-screen flex flex-col border-r border-slate-200 bg-white transition-all duration-300 z-30 shrink-0",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-slate-100">
        {!collapsed && (
          <Link href="/employee" className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold shadow-sm">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-slate-900 text-sm leading-tight tracking-tight">TalentPulse</span>
              <span className="text-[10px] uppercase font-semibold text-indigo-600 tracking-wider">Employee Portal</span>
            </div>
          </Link>
        )}
        {collapsed && (
          <div className="mx-auto w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold shadow-sm">
            <Sparkles className="w-5 h-5" />
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "p-1.5 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors",
            collapsed && "mx-auto mt-2"
          )}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {employeeNavItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === "/employee"
              ? pathname === "/employee"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={cn(
                "flex items-center rounded-md px-3 py-2 text-sm font-medium transition-all group",
                isActive
                  ? "bg-indigo-50 text-indigo-700 font-semibold shadow-xs"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
                collapsed && "justify-center px-2"
              )}
            >
              <Icon
                className={cn(
                  "w-4 h-4 shrink-0 transition-colors",
                  isActive ? "text-indigo-600" : "text-slate-400 group-hover:text-slate-600",
                  !collapsed && "mr-3"
                )}
              />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Footer Status */}
      {!collapsed && (
        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs text-slate-500 font-medium">{displayName} · Active</span>
          </div>
        </div>
      )}
    </aside>
  );
}
