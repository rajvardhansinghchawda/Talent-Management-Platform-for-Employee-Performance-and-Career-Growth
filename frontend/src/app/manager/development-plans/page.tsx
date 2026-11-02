"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  TrendingUp,
  CheckCircle2,
  XCircle,
  BookOpen,
  Plus,
  Clock,
  Sparkles,
  ArrowRight,
  User,
} from "lucide-react";
import { api } from "@/lib/api/client";
import type { DevelopmentPlanRecord, Course } from "@/lib/api/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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

export default function TeamDevelopmentPlansPage() {
  const queryClient = useQueryClient();

  const [assignCourseOpen, setAssignCourseOpen] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [selectedCourseId, setSelectedCourseId] = useState("");

  // Queries
  const { data: plansData, isLoading, error, refetch } = useQuery({
    queryKey: ["manager-devplans"],
    queryFn: () => api.manager.getDevelopmentPlans({ scope: "team" }),
  });

  const { data: coursesData } = useQuery({
    queryKey: ["courses-active"],
    queryFn: () => api.courses.list({ is_active: true }),
  });

  // Mutations
  const approveMutation = useMutation({
    mutationFn: (id: string) => api.manager.approveDevelopmentPlan(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manager-devplans"] });
      queryClient.invalidateQueries({ queryKey: ["manager-dashboard"] });
    },
  });

  const assignCourseMutation = useMutation({
    mutationFn: ({ planId, courseId }: { planId: string; courseId: string }) =>
      api.manager.assignCourseToPlan(planId, courseId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manager-devplans"] });
      setAssignCourseOpen(false);
      setSelectedCourseId("");
    },
  });

  const plans: DevelopmentPlanRecord[] = Array.isArray(plansData) ? plansData : ((plansData as any)?.results || []);
  const courses: Course[] = Array.isArray(coursesData) ? coursesData : ((coursesData as any)?.results || []);
  const pendingApprovalPlans = plans.filter((p) => p.status === "PENDING_APPROVAL");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Team Development Plans</h1>
          <p className="text-sm text-slate-500 mt-1">
            Supervise target role roadmaps, approve employee learning plans, and assign development courses.
          </p>
        </div>
      </div>

      {/* Pending Approvals Section (per §5.11) */}
      {pendingApprovalPlans.length > 0 && (
        <Card className="border-blue-300 bg-blue-50/20">
          <CardHeader className="p-4 pb-2 border-b border-blue-200/60 flex flex-row items-center justify-between">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-blue-600" />
              <CardTitle className="text-sm font-bold text-blue-900">
                Plans Awaiting Manager Approval ({pendingApprovalPlans.length})
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-4 space-y-2.5">
            {pendingApprovalPlans.map((p) => (
              <div
                key={p.id}
                className="p-3 rounded-lg bg-white border border-blue-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div>
                  <span className="font-bold text-slate-900">{p.employee_name}</span>
                  <span className="text-[11px] text-slate-500 ml-2">
                    Target Role: <strong>{p.target_role_title}</strong> · {p.item_count} items planned
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    size="sm"
                    onClick={() => approveMutation.mutate(p.id)}
                    disabled={approveMutation.isPending}
                    className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                    Approve Plan
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Plans Table */}
      {isLoading ? (
        <LoadingState rows={5} />
      ) : error ? (
        <ErrorState message="Failed to load development plans." onRetry={() => refetch()} />
      ) : plans.length === 0 ? (
        <EmptyState
          title="No development plans active"
          description="Career development roadmaps created by your team members will appear here."
        />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-64">Team Member</TableHead>
                  <TableHead>Target Promotion Role</TableHead>
                  <TableHead>Target Date</TableHead>
                  <TableHead>Action Items</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plans.map((p) => (
                  <TableRow key={p.id} className="hover:bg-slate-50/75">
                    <TableCell className="font-semibold text-xs text-slate-900">
                      <span className="block font-bold">{p.employee_name}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{p.employee_code}</span>
                    </TableCell>
                    <TableCell className="text-xs font-semibold text-indigo-700">
                      {p.target_role_title || "General"}
                    </TableCell>
                    <TableCell className="text-xs text-slate-600">
                      {p.target_date ? formatDate(p.target_date) : "—"}
                    </TableCell>
                    <TableCell className="text-xs text-slate-700">
                      <span className="font-semibold">{p.item_count}</span> items
                    </TableCell>
                    <TableCell className="text-xs">
                      <div className="space-y-1">
                        <span className="font-bold text-indigo-600">{p.progress_pct}%</span>
                        <div className="w-20 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className="h-full bg-indigo-600 rounded-full"
                            style={{ width: `${p.progress_pct}%` }}
                          />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusChip status={p.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedPlanId(p.id);
                          setAssignCourseOpen(true);
                        }}
                        className="h-8 px-2.5 text-xs text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                      >
                        <BookOpen className="w-3.5 h-3.5 mr-1" />
                        Assign Course
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* Assign Course Dialog */}
      <Dialog open={assignCourseOpen} onOpenChange={setAssignCourseOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Course to Plan</DialogTitle>
            <DialogDescription>
              Assigning a course automatically enrolls the team member and maps it into their active development roadmap.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 space-y-3 text-xs">
            <label className="font-semibold text-slate-700 block">Select Course from Catalog *</label>
            <select
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
              className="w-full h-9 px-3 rounded-md border border-slate-300 bg-white text-xs text-slate-800"
            >
              <option value="">Choose a course...</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title} ({c.provider} · {c.duration_hours} hrs)
                </option>
              ))}
            </select>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignCourseOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!selectedCourseId || assignCourseMutation.isPending}
              onClick={() =>
                assignCourseMutation.mutate({
                  planId: selectedPlanId,
                  courseId: selectedCourseId,
                })
              }
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {assignCourseMutation.isPending ? "Assigning..." : "Assign & Enroll"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
