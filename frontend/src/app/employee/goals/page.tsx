"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Target,
  Plus,
  Lock,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Search,
  Filter,
} from "lucide-react";
import { api, fetchApi } from "@/lib/api/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusChip } from "@/components/shared/StatusChip";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import { formatDate } from "@/lib/utils";

interface GoalItem {
  id: string;
  title: string;
  goal_type: string;
  weight: string | number;
  progress_pct: number;
  due_date: string | null;
  status: string;
  is_locked?: boolean;
}

export default function EmployeeGoalsPage() {
  const [cycleFilter, setCycleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");

  const {
    data: goalsData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["employee-goals", { cycleFilter, statusFilter, search }],
    queryFn: () => {
      const sp = new URLSearchParams();
      sp.append("employee", "me");
      if (cycleFilter) sp.append("cycle", cycleFilter);
      if (statusFilter) sp.append("status", statusFilter);
      if (search) sp.append("q", search);
      return fetchApi<{ results?: GoalItem[] } | GoalItem[]>(`/goals/?${sp.toString()}`);
    },
  });

  const { data: cycles } = useQuery({
    queryKey: ["review-cycles"],
    queryFn: () => api.reviewCycles.list(),
  });

  const goals: GoalItem[] = Array.isArray(goalsData) ? goalsData : goalsData?.results || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">My Goals & OKRs</h1>
          <p className="text-sm text-slate-500 mt-1">
            Track individual performance targets, progress milestones, and quarterly achievements.
          </p>
        </div>
        <Link href="/employee/goals/new">
          <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white">
            <Plus className="w-4 h-4 mr-1.5" />
            New Goal
          </Button>
        </Link>
      </div>

      {/* Filter Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                placeholder="Search goals by title or keyword..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>

            <div className="w-full md:w-56">
              <select
                value={cycleFilter}
                onChange={(e) => setCycleFilter(e.target.value)}
                className="w-full h-9 px-3 rounded-md border border-slate-300 bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600"
              >
                <option value="">All Review Cycles</option>
                {cycles?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="w-full md:w-44">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full h-9 px-3 rounded-md border border-slate-300 bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600"
              >
                <option value="">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="PENDING_APPROVAL">Pending Approval</option>
                <option value="DRAFT">Draft</option>
                <option value="COMPLETED">Completed</option>
              </select>
            </div>

            {(cycleFilter || statusFilter || search) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setCycleFilter("");
                  setStatusFilter("");
                  setSearch("");
                }}
                className="text-xs text-slate-500 hover:text-slate-900"
              >
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Goals Content */}
      {isLoading ? (
        <LoadingState rows={5} />
      ) : error ? (
        <ErrorState
          message={error instanceof Error ? error.message : "Failed to load goals."}
          onRetry={() => refetch()}
        />
      ) : goals.length === 0 ? (
        <EmptyState
          title="No goals found"
          description="Create your first quarterly goal or adjust your search filters."
          actionLabel="Create Goal"
          onAction={() => {}}
        />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-96">Goal Title</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Weight</TableHead>
                  <TableHead className="w-48">Progress</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {goals.map((g) => (
                  <TableRow key={g.id} className="hover:bg-slate-50/75">
                    <TableCell className="font-medium">
                      <div className="flex items-center space-x-2">
                        {g.is_locked && (
                          <span title="Locked: Pending Manager Approval">
                            <Lock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          </span>
                        )}
                        <Link
                          href={`/employee/goals/${g.id}`}
                          className="font-semibold text-slate-900 hover:text-indigo-600 transition-colors block text-xs"
                        >
                          {g.title}
                        </Link>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-slate-600">{g.goal_type}</TableCell>
                    <TableCell className="text-xs text-slate-700 font-medium">{g.weight}%</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2.5">
                        <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className="h-full bg-indigo-600 rounded-full transition-all duration-300"
                            style={{ width: `${Math.min(100, g.progress_pct)}%` }}
                          />
                        </div>
                        <span className="text-xs font-bold text-slate-700 w-8 text-right">
                          {g.progress_pct}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-slate-600">{formatDate(g.due_date)}</TableCell>
                    <TableCell>
                      <StatusChip status={g.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/employee/goals/${g.id}`}>
                        <Button variant="ghost" size="sm" className="h-8 px-2 text-indigo-600 hover:bg-indigo-50 text-xs">
                          View Detail <ArrowRight className="w-3.5 h-3.5 ml-1" />
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}
    </div>
  );
}
