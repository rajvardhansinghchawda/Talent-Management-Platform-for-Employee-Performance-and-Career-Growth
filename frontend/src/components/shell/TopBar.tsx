"use client";

import React, { useState } from "react";
import { Search, Bell, User, LogOut, Settings, Key, Building } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import Link from "next/link";

export function TopBar() {
  const { user, logout } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  return (
    <header className="h-16 border-b border-slate-200 bg-white sticky top-0 z-20 flex items-center justify-between px-6">
      {/* Search Input */}
      <div className="relative w-72">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Search employees, skills, courses..."
          className="w-full pl-9 pr-4 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400"
        />
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
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-indigo-600 ring-2 ring-white"></span>
          </button>

          {/* Notifications Dropdown */}
          {notificationsOpen && (
            <div className="absolute right-0 mt-2 w-80 rounded-lg border border-slate-200 bg-white shadow-lg p-4 z-50 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-3">
                <span className="font-semibold text-slate-900">Notifications</span>
                <span className="text-[10px] text-indigo-600 cursor-pointer font-medium">Mark all read</span>
              </div>
              <div className="space-y-3">
                <div className="p-2 rounded-md bg-indigo-50/50 border border-indigo-100">
                  <p className="font-medium text-slate-900">Calibration review ready</p>
                  <p className="text-slate-500 mt-0.5">Rahul Sharma review submitted by Vikram Malhotra.</p>
                  <span className="text-[10px] text-slate-400 mt-1 block">15 minutes ago</span>
                </div>
                <div className="p-2 rounded-md hover:bg-slate-50 border border-slate-100">
                  <p className="font-medium text-slate-900">Employee import finished</p>
                  <p className="text-slate-500 mt-0.5">Job EMP_BATCH_01 processed successfully.</p>
                  <span className="text-[10px] text-slate-400 mt-1 block">2 hours ago</span>
                </div>
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
              {user?.first_name?.[0] || "S"}{user?.last_name?.[0] || "J"}
            </div>
            <div className="hidden lg:flex flex-col text-left">
              <span className="text-xs font-semibold text-slate-900 leading-none">
                {user?.first_name ? `${user.first_name} ${user.last_name}` : "Sarah Jenkins"}
              </span>
              <span className="text-[10px] text-slate-500 leading-none mt-1">
                {user?.role || "HR_ADMIN"}
              </span>
            </div>
          </button>

          {profileOpen && (
            <div className="absolute right-0 mt-2 w-56 rounded-lg border border-slate-200 bg-white shadow-lg py-1.5 z-50 text-xs text-slate-700">
              <div className="px-3 py-2 border-b border-slate-100 mb-1">
                <p className="font-semibold text-slate-900">
                  {user?.first_name ? `${user.first_name} ${user.last_name}` : "Sarah Jenkins"}
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
                href="/hr/audit-logs"
                onClick={() => setProfileOpen(false)}
                className="flex items-center px-3 py-2 hover:bg-slate-50 transition-colors text-slate-700"
              >
                <Key className="w-3.5 h-3.5 mr-2 text-slate-400" />
                Security & Audit Trail
              </Link>

              <div className="border-t border-slate-100 my-1"></div>

              <button
                onClick={() => {
                  setProfileOpen(false);
                  logout();
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
