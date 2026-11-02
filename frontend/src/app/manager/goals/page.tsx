"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Target,
  Plus,
  CheckCircle2,
  XCircle,
  Search,
  Filter,
  Layers,
  ArrowRight,
  Clock,
  Sparkles,
} from "lucide-react";
import { api } from "@/lib/api/client";
import type { GoalItem, ReviewCycle } from "@/lib/api/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { StatusChip } from "@/components/shared/StatusChip";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import { formatDate } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function TeamGoalsPage() {
  const queryClient = useQueryClient();

  // Filters
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [cycleFilter, setCycleFilter] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "alignment">("list");

  // Rejection modal
  const [rejectGoalId, setRejectGoalId] = useState<string | null>(null);
  const [rejectComment, setRejectComment] = useState("");

  // Assign Goal modal
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignEmpId, setAssignEmpId] = useState("");
  const [goalTitle, setGoalTitle] = useState("");
  const [goalType, setGoalType] = useState("KPI");
  const [weight, setWeight] = useState(30);
  const [targetValue, setTargetValue] = useState(100);
  const [dueDate, setDueDate] = useState("");

  // Queries
  const { data: teamRoster } = useQuery({
    queryKey: ["manager-team"],
    queryFn: () => api.manager.getTeam(),
  });

  const { data: cycles } = useQuery({
    queryKey: ["review-cycles"],
    queryFn: () => api.reviewCycles.list(),
  });

  const { data: goalsData, isLoading, error, refetch } = useQuery({
    queryKey: ["manager-goals", { q, status: statusFilter, cycle: cycleFilter }],
    queryFn: () =>
      api.manager.getGoals({
        scope: "team",
        q: q || undefined,
        status: statusFilter || undefined,
        cycle: cycleFilter || undefined,
      }),
  });

  const { data: alignmentData } = useQuery({
    queryKey: ["manager-goal-alignment"],
    queryFn: () => api.manager.getGoalAlignment({ scope: "team" }),
    enabled: viewMode === "alignment",
  });

  // Mutations
  const approveMutation = useMutation({
    mutationFn: (id: string) => api.manager.approveGoal(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manager-goals"] });
      queryClient.invalidateQueries({ queryKey: ["manager-dashboard"] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, comment }: { id: string; comment: string }) =>
      api.manager.rejectGoal(id, comment),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manager-goals"] });
      queryClient.invalidateQueries({ queryKey: ["manager-dashboard"] });
      setRejectGoalId(null);
      setRejectComment("");
    },
  });

  const assignMutation = useMutation({
    mutationFn: (data: any) => api.manager.assignGoal(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manager-goals"] });
      queryClient.invalidateQueries({ queryKey: ["manager-dashboard"] });
      setAssignOpen(false);
      resetAssignForm();
    },
  });

  const resetAssignForm = () => {
    setAssignEmpId("");
    setGoalTitle("");
    setGoalType("KPI");
    setWeight(30);
    setTargetValue(100);
    setDueDate("");
  };

  const goals: GoalItem[] = Array.isArray(goalsData) ? goalsData : ((goalsData as any)?.results || []);
  console.log("[TeamGoalsPage] raw goalsData:", goalsData, "parsed goals count:", goals.length);
  const pendingGoals = goals.filter((g) => g.status === "PENDING_APPROVAL");
  const roster = Array.isArray(teamRoster) ? teamRoster : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Team Goals & OKRs</h1>
          <p className="text-sm text-slate-500 mt-1">
            Review submitted deliverables, approve quarterly targets, assign direct goals, and track alignment.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-xs">
            <button
              onClick={() => setViewMode("list")}
              className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                viewMode === "list" ? "bg-indigo-600 text-white" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              List View
            </button>
            <button
              onClick={() => setViewMode("alignment")}
              className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                viewMode === "alignment" ? "bg-indigo-600 text-white" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Alignment Tree
            </button>
          </div>
          <Button onClick={() => setAssignOpen(true)} size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white">
            <Plus className="w-4 h-4 mr-1.5" />
            Assign Goal
          </Button>
        </div>
      </div>

      {/* Prominent Approval Queue (per §5.5) */}
      {pendingGoals.length > 0 && (
        <Card className="border-amber-300 bg-amber-50/20">
          <CardHeader className="p-4 pb-2 border-b border-amber-200/60 flex flex-row items-center justify-between">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-amber-600" />
              <CardTitle className="text-sm font-bold text-amber-900">
                Pending Approval Queue ({pendingGoals.length})
              </CardTitle>
            </div>
            <span className="text-[11px] text-amber-700">Awaiting your approval to become active</span>
          </CardHeader>
          <CardContent className="p-4 space-y-2.5">
            {pendingGoals.map((g) => (
              <div
                key={g.id}
                className="p-3 rounded-lg bg-white border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-slate-900">{g.title}</span>
                    <Badge variant="outline" className="text-[10px]">{g.goal_type}</Badge>
                  </div>
                  <span className="text-[11px] text-slate-500 mt-0.5 block">
                    Proposed Weight: {g.weight}% · Target: {g.target_value} · Due: {g.due_date ? formatDate(g.due_date) : "End of Quarter"}
                  </span>
                </div>
                <div className="flex items-center space-x-2 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setRejectGoalId(g.id)}
                    className="h-7 text-xs border-rose-300 text-rose-700 hover:bg-rose-50"
                  >
                    <XCircle className="w-3.5 h-3.5 mr-1" />
                    Reject
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => approveMutation.mutate(g.id)}
                    disabled={approveMutation.isPending}
                    className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                    Approve Goal
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Filter Row */}
      <Card>
        <CardContent className="p-4 flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              placeholder="Search goals by title..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>

          <div className="w-full sm:w-48">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full h-9 px-3 rounded-md border border-slate-300 bg-white text-xs text-slate-800"
            >
              <option value="">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="PENDING_APPROVAL">Pending Approval</option>
              <option value="COMPLETED">Completed</option>
              <option value="DRAFT">Draft</option>
            </select>
          </div>

          <div className="w-full sm:w-56">
            <select
              value={cycleFilter}
              onChange={(e) => setCycleFilter(e.target.value)}
              className="w-full h-9 px-3 rounded-md border border-slate-300 bg-white text-xs text-slate-800"
            >
              <option value="">All Review Cycles</option>
              {cycles?.map((c: ReviewCycle) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* View: List or Alignment Tree */}
      {viewMode === "list" ? (
        isLoading ? (
          <LoadingState rows={6} />
        ) : error ? (
          <ErrorState message="Failed to load team goals." onRetry={() => refetch()} />
        ) : goals.length === 0 ? (
          <EmptyState
            title="No goals found"
            description="Assign deliverables to your direct reports to start tracking team milestones."
            actionLabel="Assign Goal"
            onAction={() => setAssignOpen(true)}
          />
        ) : (
          <Card>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-80">Goal Title</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Weight</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {goals.map((g) => (
                    <TableRow key={g.id} className="hover:bg-slate-50/75">
                      <TableCell className="font-semibold text-xs text-slate-900">
                        {g.title}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] font-mono">
                          {g.goal_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-slate-600">{g.weight}%</TableCell>
                      <TableCell className="text-xs">
                        <div className="space-y-1">
                          <span className="font-semibold text-indigo-600 block">{g.progress_pct}%</span>
                          <div className="w-24 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className="h-full bg-indigo-600 rounded-full"
                              style={{ width: `${g.progress_pct}%` }}
                            />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-slate-500">
                        {g.due_date ? formatDate(g.due_date) : "—"}
                      </TableCell>
                      <TableCell>
                        <StatusChip status={g.status} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        )
      ) : (
        /* Alignment View */
        <Card className="p-6">
          <CardHeader className="p-0 pb-4 border-b border-slate-100">
            <CardTitle className="text-base font-semibold text-slate-900">
              Strategic Goal Alignment Roll-Up
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 mt-0.5">
              Visualizes how individual contributor deliverables ladder into organizational priorities.
            </CardDescription>
          </CardHeader>
          <div className="py-6 space-y-4">
            <div className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/40">
              <span className="text-[10px] uppercase font-bold text-indigo-700 tracking-wider block">
                Company Milestone
              </span>
              <h3 className="text-sm font-bold text-slate-900 mt-0.5">
                Scale Engineering Architecture & Production Reliability
              </h3>
              <div className="mt-4 pl-6 border-l-2 border-indigo-300 space-y-3">
                {goals.map((g) => (
                  <div key={g.id} className="p-3 rounded-lg bg-white border border-slate-200 text-xs flex justify-between items-center shadow-xs">
                    <div>
                      <span className="font-semibold text-slate-900 block">{g.title}</span>
                      <span className="text-[11px] text-slate-400">Weight: {g.weight}% · Progress: {g.progress_pct}%</span>
                    </div>
                    <StatusChip status={g.status} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Reject Modal */}
      {rejectGoalId && (
        <Dialog open={!!rejectGoalId} onOpenChange={() => setRejectGoalId(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reject Goal Proposal</DialogTitle>
              <DialogDescription>
                A justification comment is required. The goal will return to Draft status for revision.
              </DialogDescription>
            </DialogHeader>

            <div className="py-2 space-y-1.5 text-xs">
              <label className="font-semibold text-slate-700 block">Rejection Note *</label>
              <textarea
                placeholder="Explain what needs adjustment before approval..."
                rows={3}
                value={rejectComment}
                onChange={(e) => setRejectComment(e.target.value)}
                className="w-full p-2.5 rounded-md border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                required
              />
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setRejectGoalId(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                disabled={!rejectComment.trim() || rejectMutation.isPending}
                onClick={() =>
                  rejectMutation.mutate({
                    id: rejectGoalId,
                    comment: rejectComment,
                  })
                }
              >
                Confirm Rejection
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Assign Goal Modal */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Goal to Team Member</DialogTitle>
            <DialogDescription>
              Manager-assigned goals are automatically set to Active status.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              assignMutation.mutate({
                employee: assignEmpId,
                title: goalTitle,
                goal_type: goalType,
                direction: "HIGHER_BETTER",
                weight,
                target_value: targetValue,
                due_date: dueDate || undefined,
              });
            }}
            className="space-y-4 py-2 text-xs"
          >
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700 block">Select Direct Report *</label>
              <select
                value={assignEmpId}
                onChange={(e) => setAssignEmpId(e.target.value)}
                className="w-full h-9 px-3 rounded-md border border-slate-300 bg-white text-xs text-slate-800"
                required
              >
                <option value="">Choose an employee...</option>
                {roster.map((m: any) => (
                  <option key={m.employee.id} value={m.employee.id}>
                    {m.employee.name} ({m.role})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700 block">Goal Title *</label>
              <Input
                placeholder="e.g. Lead PostgreSQL Indexing Benchmark on Performance Reviews"
                value={goalTitle}
                onChange={(e) => setGoalTitle(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700 block">Goal Type</label>
                <select
                  value={goalType}
                  onChange={(e) => setGoalType(e.target.value)}
                  className="w-full h-9 px-3 rounded-md border border-slate-300 bg-white text-xs text-slate-800"
                >
                  <option value="KPI">KPI Metric</option>
                  <option value="OKR">OKR Deliverable</option>
                  <option value="DEVELOPMENTAL">Developmental Skill Target</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700 block">Weight (%)</label>
                <Input
                  type="number"
                  value={weight}
                  onChange={(e) => setWeight(Number(e.target.value))}
                  min={10}
                  max={100}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700 block">Due Date</label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>

            <DialogFooter className="pt-2">
              <Button variant="outline" type="button" onClick={() => setAssignOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={assignMutation.isPending} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                {assignMutation.isPending ? "Assigning..." : "Assign Goal"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
