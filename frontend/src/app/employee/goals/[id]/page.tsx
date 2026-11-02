"use client";

import React, { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Target,
  TrendingUp,
  Clock,
  Send,
  Link as LinkIcon,
  MessageSquare,
  GitCommit,
  CheckCircle2,
  Lock,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { fetchApi } from "@/lib/api/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusChip } from "@/components/shared/StatusChip";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { formatDate, formatDateTime } from "@/lib/utils";

export default function GoalDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const queryClient = useQueryClient();

  // Progress update form state
  const [newValue, setNewValue] = useState("");
  const [note, setNote] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  // Queries
  const { data: goal, isLoading, error, refetch } = useQuery({
    queryKey: ["goal-detail", id],
    queryFn: () => fetchApi<any>(`/goals/${id}/`),
  });

  const { data: updates } = useQuery({
    queryKey: ["goal-updates", id],
    queryFn: () => fetchApi<any[]>(`/goals/${id}/updates/`),
  });

  const { data: alignment } = useQuery({
    queryKey: ["goal-alignment", id],
    queryFn: () => fetchApi<any>(`/goals/${id}/alignment/`),
  });

  const { data: comments } = useQuery({
    queryKey: ["goal-comments", id],
    queryFn: () => fetchApi<any[]>(`/goals/${id}/comments/`),
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: () =>
      fetchApi(`/goals/${id}/updates/`, {
        method: "POST",
        body: JSON.stringify({
          value: Number(newValue),
          note,
          evidence_url: evidenceUrl || undefined,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goal-detail", id] });
      queryClient.invalidateQueries({ queryKey: ["goal-updates", id] });
      queryClient.invalidateQueries({ queryKey: ["employee-dashboard"] });
      setNewValue("");
      setNote("");
      setEvidenceUrl("");
      setFormError(null);
    },
    onError: (err: any) => {
      setFormError(err.message || "Failed to record progress update.");
    },
  });

  const submitMutation = useMutation({
    mutationFn: () =>
      fetchApi(`/goals/${id}/submit/`, {
        method: "POST",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goal-detail", id] });
      queryClient.invalidateQueries({ queryKey: ["employee-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["employee-goals"] });
    },
    onError: (err: any) => {
      setFormError(err.message || "Failed to submit goal for approval.");
    },
  });

  if (isLoading) return <LoadingState rows={8} />;
  if (error || !goal) {
    return (
      <ErrorState
        message={error instanceof Error ? error.message : "Goal not found."}
        onRetry={() => refetch()}
      />
    );
  }

  // Chart data from chronological updates
  const chartData = [
    { date: formatDate(goal.created_at), value: Number(goal.start_value) },
    ...(updates || []).map((u: any) => ({
      date: formatDate(u.created_at),
      value: Number(u.value),
    })),
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <Link href="/employee/goals">
          <Button variant="ghost" size="sm" className="h-8 px-2 text-slate-500 hover:text-slate-900">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Goals
          </Button>
        </Link>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2.5">
            <h1 className="text-xl font-bold text-slate-900">{goal.title}</h1>
            <StatusChip status={goal.status} />
          </div>
          <div className="flex items-center space-x-3 text-xs text-slate-500">
            <span>Type: <strong className="text-slate-700">{goal.goal_type}</strong></span>
            <span>·</span>
            <span>Weight: <strong className="text-slate-700">{goal.weight}%</strong></span>
            <span>·</span>
            <span>Due: <strong className="text-slate-700">{formatDate(goal.due_date)}</strong></span>
          </div>
        </div>

        {goal.status === "DRAFT" && (
          <Button
            size="sm"
            onClick={() => submitMutation.mutate()}
            disabled={submitMutation.isPending}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs self-start md:self-auto"
          >
            <Send className="w-3.5 h-3.5 mr-1.5" />
            {submitMutation.isPending ? "Submitting..." : "Submit for Approval"}
          </Button>
        )}
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left / Main Column (2 spans) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Summary Card */}
          <Card>
            <CardHeader className="p-4 pb-2 border-b border-slate-100">
              <CardTitle className="text-xs font-semibold text-slate-900">Goal Metrics & Targets</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <p className="text-xs text-slate-600 mb-6">{goal.description || "No description provided."}</p>

              <div className="grid grid-cols-4 gap-4 text-center">
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="text-[10px] uppercase font-semibold text-slate-400 block">Start</span>
                  <span className="text-base font-bold text-slate-800">{goal.start_value}</span>
                </div>
                <div className="p-3 rounded-lg bg-indigo-50/70 border border-indigo-100">
                  <span className="text-[10px] uppercase font-semibold text-indigo-500 block">Current</span>
                  <span className="text-base font-bold text-indigo-700">{goal.current_value}</span>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="text-[10px] uppercase font-semibold text-slate-400 block">Target</span>
                  <span className="text-base font-bold text-slate-800">{goal.target_value}</span>
                </div>
                <div className="p-3 rounded-lg bg-emerald-50/70 border border-emerald-100">
                  <span className="text-[10px] uppercase font-semibold text-emerald-600 block">Progress</span>
                  <span className="text-base font-bold text-emerald-700">{goal.progress_pct}%</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Progress Over Time Line Chart */}
          <Card>
            <CardHeader className="p-4 pb-2 border-b border-slate-100">
              <CardTitle className="text-xs font-semibold text-slate-900 flex items-center justify-between">
                Progress Over Time
                <TrendingUp className="w-4 h-4 text-indigo-500" />
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="date" stroke="#94A3B8" fontSize={11} tickLine={false} />
                    <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#FFFFFF", borderRadius: "8px", border: "1px solid #E2E8F0", fontSize: "12px" }}
                    />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="#4F46E5"
                      strokeWidth={2.5}
                      dot={{ r: 4, fill: "#4F46E5" }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Update Progress Form (Enabled only if ACTIVE) */}
          <Card>
            <CardHeader className="p-4 pb-2 border-b border-slate-100">
              <CardTitle className="text-xs font-semibold text-slate-900">Record Progress Milestone</CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Log measurable progress towards your target with optional evidence link
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              {goal.status !== "ACTIVE" ? (
                <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-500 text-center">
                  <Lock className="w-4 h-4 mx-auto mb-1 text-slate-400" />
                  Progress updates are disabled while goal is in <strong>{goal.status}</strong> status.
                </div>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!newValue) return;
                    updateMutation.mutate();
                  }}
                  className="space-y-4 text-xs"
                >
                  {formError && (
                    <div className="p-2.5 rounded bg-red-50 border border-red-200 text-red-700">
                      {formError}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="font-semibold text-slate-700 block">New Metric Value *</label>
                      <Input
                        type="number"
                        placeholder={`e.g. ${Number(goal.current_value) + 10}`}
                        value={newValue}
                        onChange={(e) => setNewValue(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="font-semibold text-slate-700 block">Evidence Link (URL)</label>
                      <Input
                        type="url"
                        placeholder="https://github.com/... or PR link"
                        value={evidenceUrl}
                        onChange={(e) => setEvidenceUrl(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-semibold text-slate-700 block">Progress Notes</label>
                    <textarea
                      rows={2}
                      placeholder="Briefly state what was delivered or milestone completed..."
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      className="w-full rounded-md border border-slate-300 p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                    />
                  </div>

                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      disabled={updateMutation.isPending || !newValue}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white"
                    >
                      <Send className="w-3.5 h-3.5 mr-1.5" />
                      {updateMutation.isPending ? "Recording..." : "Record Progress"}
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>

          {/* Timeline of Updates */}
          <Card>
            <CardHeader className="p-4 pb-2 border-b border-slate-100">
              <CardTitle className="text-xs font-semibold text-slate-900">Progress History Timeline</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {!updates || updates.length === 0 ? (
                <p className="text-xs text-slate-400 py-3 text-center">No progress updates recorded yet.</p>
              ) : (
                <div className="space-y-4">
                  {updates.map((u: any) => (
                    <div key={u.id} className="flex items-start space-x-3 text-xs pb-3 border-b border-slate-100 last:border-0 last:pb-0">
                      <div className="w-2 h-2 rounded-full bg-indigo-600 mt-1.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-slate-900">Value: {u.value}</span>
                          <span className="text-[11px] text-slate-400">{formatDateTime(u.created_at)}</span>
                        </div>
                        {u.note && <p className="text-slate-600 mt-1">{u.note}</p>}
                        {u.evidence_url && (
                          <a
                            href={u.evidence_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[11px] text-indigo-600 hover:underline flex items-center mt-1"
                          >
                            <LinkIcon className="w-3 h-3 mr-1" />
                            {u.evidence_url}
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right / Secondary Column (1 span) */}
        <div className="space-y-6">
          {/* Alignment Tree Card */}
          <Card>
            <CardHeader className="p-4 pb-2 border-b border-slate-100">
              <CardTitle className="text-xs font-semibold text-slate-900 flex items-center space-x-1.5">
                <GitCommit className="w-3.5 h-3.5 text-indigo-600" />
                <span>Organizational Alignment</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 text-xs space-y-3">
              {alignment?.ancestors?.length > 0 && (
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-semibold text-slate-400 block">Parent Goal</span>
                  {alignment.ancestors.map((anc: any) => (
                    <div key={anc.id} className="p-2 rounded bg-slate-50 border border-slate-100 font-medium text-slate-700">
                      {anc.title}
                    </div>
                  ))}
                </div>
              )}
              <div className="p-2.5 rounded-lg bg-indigo-50 border border-indigo-200">
                <span className="text-[10px] uppercase font-bold text-indigo-700 block">This Goal</span>
                <span className="font-semibold text-slate-900 block mt-0.5">{goal.title}</span>
              </div>
            </CardContent>
          </Card>

          {/* Manager Comments */}
          <Card>
            <CardHeader className="p-4 pb-2 border-b border-slate-100">
              <CardTitle className="text-xs font-semibold text-slate-900 flex items-center space-x-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                <span>Manager Comments</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3 text-xs">
              {!comments || comments.length === 0 ? (
                <p className="text-slate-400 text-center py-4">No comments recorded.</p>
              ) : (
                comments.map((c: any) => (
                  <div key={c.id} className="p-2.5 rounded bg-slate-50 border border-slate-100 space-y-1">
                    <div className="flex justify-between items-center text-[10px] text-slate-500">
                      <span className="font-semibold text-slate-700">{c.author?.name || "Manager"}</span>
                      <span>{formatDate(c.created_at)}</span>
                    </div>
                    <p className="text-slate-800">{c.text}</p>
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
