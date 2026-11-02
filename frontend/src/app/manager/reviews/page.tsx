"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FileText,
  Send,
  Clock,
  CheckCircle2,
  AlertCircle,
  Eye,
  Edit3,
  Search,
  Filter,
} from "lucide-react";
import { api } from "@/lib/api/client";
import type { ReviewCycle } from "@/lib/api/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { StatusChip } from "@/components/shared/StatusChip";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import { formatDate } from "@/lib/utils";

export default function TeamReviewsPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("");
  const [cycleFilter, setCycleFilter] = useState("");
  const [reminderMsg, setReminderMsg] = useState<string | null>(null);

  // Queries
  const { data: cycles } = useQuery({
    queryKey: ["review-cycles"],
    queryFn: () => api.reviewCycles.list(),
  });

  const { data: reviewsData, isLoading, error, refetch } = useQuery({
    queryKey: ["manager-reviews", { status: statusFilter, cycle: cycleFilter }],
    queryFn: () =>
      api.manager.getReviews({
        scope: "team",
        status: statusFilter || undefined,
        cycle: cycleFilter || undefined,
      }),
  });

  // Remind Mutation
  const remindMutation = useMutation({
    mutationFn: (ids: string[]) => api.manager.remindReviews(ids),
    onSuccess: (res) => {
      setReminderMsg(`Sent ${res.reminders_sent} reminder notification(s) to employees.`);
      setTimeout(() => setReminderMsg(null), 4000);
    },
  });

  const reviews = Array.isArray(reviewsData) ? reviewsData : ((reviewsData as any)?.results || []);
  const overdueReviews = reviews.filter(
    (r: any) => r.status === "SELF_ASSESSMENT" || r.status === "NOT_STARTED"
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Team Performance Reviews</h1>
          <p className="text-sm text-slate-500 mt-1">
            Conduct formal appraisal evaluations, review self-assessments, and submit ratings to calibration.
          </p>
        </div>
        {overdueReviews.length > 0 && (
          <Button
            size="sm"
            onClick={() => remindMutation.mutate(overdueReviews.map((r: any) => r.id))}
            disabled={remindMutation.isPending}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs"
          >
            <Send className="w-3.5 h-3.5 mr-1.5" />
            Send Bulk Reminders ({overdueReviews.length})
          </Button>
        )}
      </div>

      {reminderMsg && (
        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-medium flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{reminderMsg}</span>
        </div>
      )}

      {/* Filter Row */}
      <Card>
        <CardContent className="p-4 flex flex-col sm:flex-row items-center gap-3">
          <div className="w-full sm:w-64">
            <select
              value={cycleFilter}
              onChange={(e) => setCycleFilter(e.target.value)}
              className="w-full h-9 px-3 rounded-md border border-slate-300 bg-white text-xs text-slate-800"
            >
              <option value="">All Review Cycles</option>
              {cycles?.map((c: ReviewCycle) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.status})
                </option>
              ))}
            </select>
          </div>

          <div className="w-full sm:w-56">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full h-9 px-3 rounded-md border border-slate-300 bg-white text-xs text-slate-800"
            >
              <option value="">All Review Stages</option>
              <option value="NOT_STARTED">Not Started</option>
              <option value="SELF_ASSESSMENT">Self-Assessment</option>
              <option value="MANAGER_REVIEW">Manager Review</option>
              <option value="CALIBRATION">Calibration</option>
              <option value="COMPLETED">Completed</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Reviews Table */}
      {isLoading ? (
        <LoadingState rows={5} />
      ) : error ? (
        <ErrorState message="Failed to load team reviews." onRetry={() => refetch()} />
      ) : reviews.length === 0 ? (
        <EmptyState
          title="No reviews scheduled"
          description="Active appraisal reviews for your team members will appear here."
        />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-64">Employee</TableHead>
                  <TableHead>Review Cycle</TableHead>
                  <TableHead>Current Stage</TableHead>
                  <TableHead>Self Rating</TableHead>
                  <TableHead>Manager Rating</TableHead>
                  <TableHead>Next Action</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reviews.map((r: any) => {
                  const isManagerTurn = r.status === "MANAGER_REVIEW";
                  return (
                    <TableRow key={r.id} className="hover:bg-slate-50/75">
                      <TableCell className="font-semibold text-xs text-slate-900">
                        <span className="block font-bold">{r.employee?.name}</span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {r.employee?.employee_code} · {r.employee?.department?.name || "Engineering"}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-slate-700">
                        {r.cycle?.name || "H2 2026 Annual Cycle"}
                      </TableCell>
                      <TableCell>
                        <StatusChip status={r.status} />
                      </TableCell>
                      <TableCell className="text-xs text-slate-600 font-semibold">
                        {r.self_rating ? `${r.self_rating} / 5` : <span className="text-slate-300 italic">Pending</span>}
                      </TableCell>
                      <TableCell className="text-xs text-indigo-600 font-bold">
                        {r.manager_rating ? `${r.manager_rating} / 5` : <span className="text-slate-300 italic">—</span>}
                      </TableCell>
                      <TableCell>
                        {isManagerTurn ? (
                          <Badge variant="default" className="text-[10px] bg-indigo-600 text-white font-bold animate-pulse">
                            Evaluate Team Member
                          </Badge>
                        ) : r.status === "SELF_ASSESSMENT" ? (
                          <span className="text-[11px] text-amber-700 font-medium">Awaiting Self-Assessment</span>
                        ) : (
                          <span className="text-[11px] text-slate-400">In Calibration / Completed</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Link href={`/manager/reviews/${r.id}`}>
                          <Button
                            size="sm"
                            className={`h-8 px-2.5 text-xs ${
                              isManagerTurn
                                ? "bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                                : "bg-white border border-slate-300 text-slate-700 hover:bg-slate-50"
                            }`}
                          >
                            <Edit3 className="w-3.5 h-3.5 mr-1" />
                            {isManagerTurn ? "Start Evaluation" : "View Review"}
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}
    </div>
  );
}
