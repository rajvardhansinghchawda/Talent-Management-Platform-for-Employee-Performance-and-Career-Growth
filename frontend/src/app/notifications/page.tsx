"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  CheckCheck,
  Settings,
  Sparkles,
  ArrowRight,
  Filter,
  Circle,
  Clock,
  ArrowLeft,
} from "lucide-react";
import { fetchApi } from "@/lib/api/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import { formatDateTime } from "@/lib/utils";

interface NotificationItem {
  id: string;
  category: string;
  title: string;
  body: string;
  link: string;
  is_read: boolean;
  read_at?: string | null;
  created_at: string;
}

export default function NotificationsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [filterUnread, setFilterUnread] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("");

  const {
    data: notifications,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["notifications-list", filterUnread, categoryFilter],
    queryFn: () => {
      const sp = new URLSearchParams();
      if (filterUnread) sp.append("is_read", "false");
      if (categoryFilter) sp.append("category", categoryFilter);
      return fetchApi<NotificationItem[]>(`/notifications/?${sp.toString()}`);
    },
  });

  const markAllMutation = useMutation({
    mutationFn: () => fetchApi("/notifications/mark-all-read/", { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications-list"] });
    },
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => fetchApi(`/notifications/${id}/read/`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications-list"] });
    },
  });

  if (isLoading) return <LoadingState rows={6} />;
  if (error) {
    return (
      <ErrorState
        message={error instanceof Error ? error.message : "Failed to load notifications."}
        onRetry={() => refetch()}
      />
    );
  }

  const items: NotificationItem[] = Array.isArray(notifications) ? notifications : [];

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center space-x-3">
            <Button variant="ghost" size="sm" onClick={() => router.back()} className="h-8 px-2 text-slate-500 hover:text-slate-900">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Notification Center</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Activity alerts, review cycle reminders, feedback requests, and system announcements.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Link href="/settings/notifications">
              <Button size="sm" variant="outline" className="bg-white text-xs">
                <Settings className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
                Alert Preferences
              </Button>
            </Link>
            <Button
              size="sm"
              variant="outline"
              onClick={() => markAllMutation.mutate()}
              disabled={markAllMutation.isPending}
              className="bg-white text-xs"
            >
              <CheckCheck className="w-3.5 h-3.5 mr-1.5 text-indigo-600" />
              Mark All Read
            </Button>
          </div>
        </div>

        {/* Filter Toolbar */}
        <Card>
          <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setFilterUnread(false)}
                className={`px-3 py-1.5 rounded-md font-semibold transition-colors ${
                  !filterUnread ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                All Alerts
              </button>
              <button
                type="button"
                onClick={() => setFilterUnread(true)}
                className={`px-3 py-1.5 rounded-md font-semibold transition-colors ${
                  filterUnread ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                Unread Only
              </button>
            </div>

            <div className="w-48">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full h-8 px-2.5 rounded-md border border-slate-300 bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600"
              >
                <option value="">All Categories</option>
                <option value="CYCLE_STARTED">Review Cycles</option>
                <option value="GOAL_DECISION">Goals</option>
                <option value="FEEDBACK_RECEIVED">Feedback</option>
                <option value="COURSE_ASSIGNED">Learning</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Notifications List */}
        {items.length === 0 ? (
          <EmptyState
            title="All caught up!"
            description={filterUnread ? "You have no unread notifications." : "No notifications received yet."}
          />
        ) : (
          <div className="space-y-3">
            {items.map((n) => (
              <Card
                key={n.id}
                className={`transition-colors hover:border-slate-300 ${
                  !n.is_read ? "border-indigo-200 bg-indigo-50/20 shadow-xs" : "border-slate-200 bg-white"
                }`}
              >
                <CardContent className="p-4 flex items-start justify-between gap-4 text-xs">
                  <div className="flex items-start space-x-3 flex-1 min-w-0">
                    <div className={`p-2 rounded-full mt-0.5 shrink-0 ${!n.is_read ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-500"}`}>
                      <Bell className="w-4 h-4" />
                    </div>

                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-slate-900 truncate">{n.title}</span>
                        {!n.is_read && (
                          <span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0" title="Unread" />
                        )}
                        <Badge variant="secondary" className="text-[9px] uppercase tracking-wider font-semibold ml-auto">
                          {n.category.replace(/_/g, " ")}
                        </Badge>
                      </div>
                      <p className="text-slate-600 leading-snug">{n.body}</p>
                      <span className="text-[11px] text-slate-400 block pt-1">{formatDateTime(n.created_at)}</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0 pt-1">
                    {!n.is_read && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => markReadMutation.mutate(n.id)}
                        className="h-7 text-xs text-slate-500 hover:text-slate-900"
                      >
                        Mark read
                      </Button>
                    )}
                    {n.link && (
                      <Link href={n.link}>
                        <Button
                          size="sm"
                          onClick={() => {
                            if (!n.is_read) markReadMutation.mutate(n.id);
                          }}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white h-7 text-xs"
                        >
                          View <ArrowRight className="w-3.5 h-3.5 ml-1" />
                        </Button>
                      </Link>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
