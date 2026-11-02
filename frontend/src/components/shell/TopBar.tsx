"use client";

import React, { useState } from "react";
import { Search, Bell, User, LogOut, Settings, Key, Building, CheckCheck, SlidersHorizontal, ShieldCheck, Menu } from "lucide-react";
import { useMobileNav } from "@/components/shell/MobileNavContext";
import { useAuth } from "@/lib/auth/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchApi } from "@/lib/api/client";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface NotificationItem {
  id: string;
  category: string;
  title: string;
  body: string;
  link?: string;
  is_read: boolean;
  created_at: string;
}

export function TopBar() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const { toggle } = useMobileNav();

  const { data: notifications } = useQuery<NotificationItem[]>({
    queryKey: ["topbar-notifications"],
    queryFn: () => fetchApi<NotificationItem[]>("/notifications/"),
    refetchInterval: 30000,
  });

  const unreadCount = Array.isArray(notifications)
    ? notifications.filter((n) => !n.is_read).length
    : 0;

  const markAllMutation = useMutation({
    mutationFn: () => fetchApi("/notifications/mark-all-read/", { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["topbar-notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-list"] });
    },
  });
  return (
    <header className="h-16 border-b border-slate-200 bg-white sticky top-0 z-20 flex items-center justify-between px-4 sm:px-6">
      {/* Left controls: Hamburger on mobile + Search */}
      <div className="flex items-center">
        <button
          onClick={toggle}
          className="lg:hidden mr-2 p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors shrink-0"
          title="Toggle Navigation Menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="relative w-36 sm:w-56 md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center space-x-3">
        {/* Organization Chip */}
        <div className="hidden md:flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 text-xs font-medium">
          <Building className="w-3.5 h-3.5 text-slate-500" />
          <span>Acme Corporation</span>
        </div>

        {/* Notification Bell */}
        <div className="relative">
          <button
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            className="p-2 rounded-full text-slate-500 hover:text-slate-700 hover:bg-slate-100 relative transition-colors"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-indigo-600 ring-2 ring-white"></span>
            )}
          </button>

          {/* Notifications Dropdown */}
          {notificationsOpen && (
            <div className="absolute right-0 mt-2 w-80 rounded-lg border border-slate-200 bg-white shadow-lg p-4 z-50 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-3">
                <div className="flex items-center space-x-1.5">
                  <span className="font-semibold text-slate-900">Notifications</span>
                  {unreadCount > 0 && (
                    <span className="px-1.5 py-0.2 bg-indigo-100 text-indigo-700 font-bold text-[10px] rounded-full">
                      {unreadCount}
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={() => markAllMutation.mutate()}
                    className="text-[10px] text-indigo-600 hover:text-indigo-800 cursor-pointer font-medium flex items-center"
                  >
                    <CheckCheck className="w-3 h-3 mr-0.5" />
                    Mark all read
                  </button>
                )}
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {Array.isArray(notifications) && notifications.length > 0 ? (
                  notifications.slice(0, 4).map((n) => (
                    <div
                      key={n.id}
                      className={`p-2 rounded-md border transition-colors ${
                        n.is_read ? "bg-white border-slate-100" : "bg-indigo-50/50 border-indigo-100 font-medium"
                      }`}
                    >
                      <p className="font-semibold text-slate-900 leading-tight">{n.title}</p>
                      <p className="text-slate-500 text-[11px] mt-0.5 line-clamp-2">{n.body}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-slate-400 text-center py-4 text-xs">No notifications</p>
                )}
              </div>
              <div className="pt-2.5 mt-2 border-t border-slate-100 flex items-center justify-between">
                <Link
                  href="/notifications"
                  onClick={() => setNotificationsOpen(false)}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  View all in Center →
                </Link>
                <Link
                  href="/settings/notifications"
                  onClick={() => setNotificationsOpen(false)}
                  className="text-slate-400 hover:text-slate-600"
                  title="Alert Settings"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Profile Avatar & Menu */}
        <div className="relative">
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center space-x-2.5 p-1 rounded-full hover:bg-slate-100 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-semibold flex items-center justify-center text-xs border border-indigo-200">
              {user?.role === "EMPLOYEE" ? "RS" : user?.role === "EXECUTIVE" ? "DS" : "SJ"}
            </div>
            <div className="hidden lg:flex flex-col text-left">
              <span className="text-xs font-semibold text-slate-900 leading-none">
                {user?.role === "EMPLOYEE"
                  ? "Rahul Sharma"
                  : user?.role === "EXECUTIVE"
                  ? "David Sterling"
                  : "Sarah Jenkins"}
              </span>
              <span className="text-[10px] text-slate-500 leading-none mt-1">
                {user?.role || "EMPLOYEE"}
              </span>
            </div>
          </button>

          {profileOpen && (
            <div className="absolute right-0 mt-2 w-56 rounded-lg border border-slate-200 bg-white shadow-lg py-1.5 z-50 text-xs text-slate-700">
              <div className="px-3 py-2 border-b border-slate-100 mb-1">
                <p className="font-semibold text-slate-900">
                  {user?.first_name
                    ? `${user.first_name} ${user.last_name}`
                    : user?.role === "EMPLOYEE"
                    ? "Rahul Sharma"
                    : user?.role === "EXECUTIVE"
                    ? "David Sterling"
                    : user?.role === "MANAGER"
                    ? "Vikram Malhotra"
                    : "Sarah Jenkins"}
                </p>
                <p className="text-slate-500 truncate text-[11px]">{user?.email || "hr@acme.com"}</p>
              </div>

              <Link
                href="/hr/settings"
                onClick={() => setProfileOpen(false)}
                className="flex items-center px-3 py-2 hover:bg-slate-50 transition-colors text-slate-700"
              >
                <Settings className="w-3.5 h-3.5 mr-2 text-slate-400" />
                Organization Settings
              </Link>
              <Link
                href="/notifications"
                onClick={() => setProfileOpen(false)}
                className="flex items-center px-3 py-2 hover:bg-slate-50 transition-colors text-slate-700"
              >
                <Bell className="w-3.5 h-3.5 mr-2 text-slate-400" />
                Notification Center
              </Link>
              <Link
                href="/settings/notifications"
                onClick={() => setProfileOpen(false)}
                className="flex items-center px-3 py-2 hover:bg-slate-50 transition-colors text-slate-700"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 mr-2 text-slate-400" />
                Alert Preferences
              </Link>
              <Link
                href="/change-password"
                onClick={() => setProfileOpen(false)}
                className="flex items-center px-3 py-2 hover:bg-slate-50 transition-colors text-slate-700"
              >
                <Key className="w-3.5 h-3.5 mr-2 text-slate-400" />
                Change Password
              </Link>
              <div className="border-t border-slate-100 my-1"></div>

              <button
                onClick={async () => {
                  setProfileOpen(false);
                  await logout();
                  router.push("/login");
                }}
                className="w-full flex items-center px-3 py-2 text-red-600 hover:bg-red-50 transition-colors text-left font-medium"
              >
                <LogOut className="w-3.5 h-3.5 mr-2 text-red-500" />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
