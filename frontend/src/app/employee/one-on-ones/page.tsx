"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Calendar, Clock, CheckSquare, MessageSquare, UserCheck, AlertCircle } from "lucide-react";
import { fetchApi } from "@/lib/api/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusChip } from "@/components/shared/StatusChip";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { formatDate, formatDateTime } from "@/lib/utils";

interface MeetingData {
  meetings: Array<{
    id: string;
    with: string;
    scheduled_at: string;
    status: string;
    shared_notes?: string;
  }>;
  action_items: Array<{
    id: string;
    title: string;
    due_date?: string | null;
    status: string;
  }>;
}

export default function OneOnOnesPage() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["employee-one-on-ones"],
    queryFn: () => fetchApi<MeetingData>("/one-on-ones/"),
  });

  if (isLoading) return <LoadingState rows={6} />;
  if (error || !data) {
    return (
      <ErrorState
        message={error instanceof Error ? error.message : "Failed to load 1:1 meetings."}
        onRetry={() => refetch()}
      />
    );
  }

  const { meetings, action_items } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">1:1 Manager Syncs</h1>
        <p className="text-sm text-slate-500 mt-1">
          Scheduled 1:1 syncs, collaborative talking points, shared notes, and agreed action items.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Meetings (2 spans) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Upcoming Sync Card */}
          <Card className="border-indigo-100 bg-gradient-to-r from-indigo-50/20 to-white">
            <CardHeader className="p-6 pb-2">
              <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-600 block">
                Next Scheduled Sync
              </span>
              <CardTitle className="text-base font-bold text-slate-900 mt-0.5">
                Bi-Weekly 1:1 with Vikram Malhotra
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 pt-2 space-y-3 text-xs">
              <div className="flex items-center space-x-3 text-slate-600">
                <Clock className="w-4 h-4 text-indigo-500" />
                <span>Scheduled for: <strong>Thursday at 10:00 AM (45 mins)</strong></span>
              </div>
              <p className="text-slate-600 bg-white p-3 rounded-lg border border-slate-200">
                Agenda: Q4 Backend OKR milestones, System Design course completion, and review of readiness checklist criteria.
              </p>
            </CardContent>
          </Card>

          {/* Past Meetings & Shared Notes */}
          <Card>
            <CardHeader className="p-6 pb-3 border-b border-slate-100">
              <CardTitle className="text-base font-semibold text-slate-900">Meeting History & Shared Notes</CardTitle>
              <CardDescription className="text-xs text-slate-500 mt-0.5">
                Mutual notes and discussion summaries agreed during 1:1 syncs
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              {meetings.length === 0 ? (
                <p className="text-xs text-slate-400 py-3 text-center">No past meetings recorded.</p>
              ) : (
                meetings.map((m) => (
                  <div key={m.id} className="p-4 rounded-lg bg-slate-50/50 border border-slate-200 space-y-2 text-xs">
                    <div className="flex justify-between items-center font-semibold text-slate-900">
                      <span>Sync with {m.with}</span>
                      <StatusChip status={m.status} />
                    </div>
                    <span className="text-[11px] text-slate-400 block">{formatDateTime(m.scheduled_at)}</span>
                    <div className="p-3 rounded bg-white border border-slate-200 text-slate-700 leading-relaxed">
                      {m.shared_notes || "Completed sprint retrospective and discussed technical ownership on Goals API."}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Action Items Checklist (1 span) */}
        <div>
          <Card>
            <CardHeader className="p-6 pb-3 border-b border-slate-100">
              <CardTitle className="text-base font-semibold text-slate-900 flex items-center space-x-2">
                <CheckSquare className="w-4 h-4 text-indigo-600" />
                <span>Action Items Checklist</span>
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 mt-0.5">
                Agreed next steps assigned to you
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-3">
              {action_items.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">All action items completed.</p>
              ) : (
                action_items.map((ai) => (
                  <div key={ai.id} className="p-3 rounded-lg border border-slate-200 bg-white flex items-start space-x-2.5 text-xs">
                    <div className="w-2 h-2 rounded-full bg-indigo-600 mt-1 shrink-0" />
                    <div className="flex-1 space-y-1">
                      <span className="font-semibold text-slate-900 block leading-tight">{ai.title}</span>
                      {ai.due_date && <span className="text-[11px] text-slate-400 block">Due {formatDate(ai.due_date)}</span>}
                    </div>
                    <StatusChip status={ai.status} />
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
