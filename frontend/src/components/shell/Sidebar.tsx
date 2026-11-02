"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Building2,
  RefreshCw,
  SlidersHorizontal,
  Award,
  Briefcase,
  BookOpen,
  BarChart3,
  FileText,
  ShieldCheck,
  Settings,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useMobileNav } from "@/components/shell/MobileNavContext";

const navItems = [
  { href: "/hr", label: "Dashboard", icon: LayoutDashboard },
  { href: "/hr/employees", label: "Employees", icon: Users },
  { href: "/hr/departments", label: "Departments", icon: Building2 },
  { href: "/hr/review-cycles", label: "Review Cycles", icon: RefreshCw },
  { href: "/hr/calibration", label: "Calibration", icon: SlidersHorizontal },
  { href: "/hr/skills", label: "Skills", icon: Award },
  { href: "/hr/roles", label: "Roles", icon: Briefcase },
  { href: "/hr/courses", label: "Courses", icon: BookOpen },
  { href: "/hr/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/hr/reports", label: "Reports", icon: FileText },
  { href: "/hr/audit-logs", label: "Audit Logs", icon: ShieldCheck },
  { href: "/hr/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const { isOpen, close } = useMobileNav();

  const renderNavLinks = (onItemClick?: () => void) => (
    <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive =
          item.href === "/hr"
            ? pathname === "/hr"
            : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onItemClick}
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
            {(!collapsed || onItemClick) && <span>{item.label}</span>}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <>
      {/* Desktop Sidebar (lg:flex, hidden on mobile/tablet) */}
      <aside
        className={cn(
          "hidden lg:flex sticky top-0 h-screen flex-col border-r border-slate-200 bg-white transition-all duration-300 z-30 shrink-0",
          collapsed ? "w-16" : "w-64"
        )}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-100">
          {!collapsed && (
            <Link href="/hr" className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold shadow-sm">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-slate-900 text-sm leading-tight tracking-tight">TalentPulse</span>
                <span className="text-[10px] uppercase font-semibold text-indigo-600 tracking-wider">HR Admin Portal</span>
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
        {renderNavLinks()}

        {/* Footer Status */}
        {!collapsed && (
          <div className="p-4 border-t border-slate-100 bg-slate-50/50">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-xs text-slate-500 font-medium">Acme Corp · Live</span>
            </div>
          </div>
        )}
      </aside>

      {/* Mobile & Tablet Slide-over Drawer (< lg) */}
      {isOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          {/* Dark Overlay */}
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200"
            onClick={close}
            aria-hidden="true"
          />

          {/* Drawer Panel */}
          <aside className="relative flex flex-col w-72 max-w-[85vw] h-full bg-white shadow-2xl z-50 animate-in slide-in-from-left duration-200">
            <div className="h-16 flex items-center justify-between px-4 border-b border-slate-100">
              <Link href="/hr" onClick={close} className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold shadow-sm">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-slate-900 text-sm leading-tight tracking-tight">TalentPulse</span>
                  <span className="text-[10px] uppercase font-semibold text-indigo-600 tracking-wider">HR Admin Portal</span>
                </div>
              </Link>
              <button
                onClick={close}
                className="p-1.5 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                title="Close navigation"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {renderNavLinks(close)}

            <div className="p-4 border-t border-slate-100 bg-slate-50/50">
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-xs text-slate-500 font-medium">Acme Corp · Mobile</span>
              </div>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
