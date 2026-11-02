"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ListChecks, Plus, CheckCircle2, Clock, Calendar, ArrowRight, Target } from "lucide-react";
import { fetchApi } from "@/lib/api/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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

export default function DevelopmentPlanPage() {
  const queryClient = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [itemType, setItemType] = useState("COURSE");
  const [rationale, setRationale] = useState("");

  const { data: plansData, isLoading, error, refetch } = useQuery({
    queryKey: ["development-plans"],
    queryFn: () => fetchApi<any[]>("/development-plans/"),
  });

  const proposeMutation = useMutation({
    mutationFn: () =>
      fetchApi("/development-plans/", {
        method: "POST",
        body: JSON.stringify({
          title,
          item_type: itemType,
          rationale,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["development-plans"] });
      queryClient.invalidateQueries({ queryKey: ["employee-dashboard"] });
      setDialogOpen(false);
      setTitle("");
      setRationale("");
    },
  });

  if (isLoading) return <LoadingState rows={6} />;
  if (error) {
    return (
      <ErrorState
        message={error instanceof Error ? error.message : "Failed to load development plan."}
        onRetry={() => refetch()}
      />
    );
  }

  const plan = Array.isArray(plansData) && plansData.length > 0 ? plansData[0] : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">My Development Plan</h1>
          <p className="text-sm text-slate-500 mt-1">
            Personal growth trajectory, scheduled training actions, and competency development items.
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)} size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white">
          <Plus className="w-4 h-4 mr-1.5" />
          Propose Action Item
        </Button>
      </div>

      {!plan ? (
        <EmptyState
          title="No active development plan"
          description="Create your initial career development plan to track agreed growth actions with your manager."
          actionLabel="Create Plan Item"
          onAction={() => setDialogOpen(true)}
        />
      ) : (
        <div className="space-y-6">
          {/* Plan Summary Card */}
          <Card className="border-indigo-100 bg-gradient-to-r from-indigo-50/30 to-white">
            <CardHeader className="p-6 pb-4 border-b border-slate-100 flex flex-row items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 block">
                  Target Role: {plan.target_role}
                </span>
                <CardTitle className="text-base font-bold text-slate-900 mt-0.5">
                  FY26 Growth & Promotion Trajectory
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Plan Timeline: {formatDate(plan.start_date)} — {formatDate(plan.target_date)}
                </CardDescription>
              </div>
              <StatusChip status={plan.status} />
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-2 max-w-sm">
                <div className="flex justify-between text-xs font-semibold text-slate-700">
                  <span>Overall Action Items Completed</span>
                  <span>{plan.progress_pct}%</span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${plan.progress_pct}%` }} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Plan Items Table */}
          <Card>
            <CardHeader className="p-6 pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold text-slate-900">Agreed Development Actions</CardTitle>
                <CardDescription className="text-xs text-slate-500 mt-0.5">
                  Structured learning, mentoring, and technical stretch deliverables
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-96">Action Item</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Target Due</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {plan.items?.map((item: any) => (
                    <TableRow key={item.id} className="hover:bg-slate-50/75">
                      <TableCell className="font-medium">
                        <span className="font-semibold text-xs text-slate-900 block">{item.title}</span>
                        {item.rationale && <span className="text-[11px] text-slate-500">{item.rationale}</span>}
                      </TableCell>
                      <TableCell className="text-xs text-slate-600 capitalize">
                        {item.item_type.toLowerCase().replace(/_/g, " ")}
                      </TableCell>
                      <TableCell className="text-xs text-slate-600">{formatDate(item.due_date)}</TableCell>
                      <TableCell>
                        <StatusChip status={item.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" className="h-7 text-xs">
                          Update Progress
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Propose Modal */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Propose Development Action</DialogTitle>
            <DialogDescription>
              Suggest a course, certification, or stretch project to add to your plan.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700 block">Action Title *</label>
              <Input
                placeholder="e.g. Lead Database Sharding & Indexing Workshop"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700 block">Item Category *</label>
              <select
                value={itemType}
                onChange={(e) => setItemType(e.target.value)}
                className="w-full h-9 px-3 rounded-md border border-slate-300 bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600"
              >
                <option value="COURSE">Course / Training</option>
                <option value="PROJECT">Hands-on Stretch Project</option>
                <option value="MENTORING">Mentoring & Knowledge Transfer</option>
                <option value="CERTIFICATION">Industry Certification</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700 block">Rationale / Gap Addressed</label>
              <textarea
                rows={2}
                placeholder="Explain how this addresses your promotion target role..."
                value={rationale}
                onChange={(e) => setRationale(e.target.value)}
                className="w-full rounded-md border border-slate-300 p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!title.trim() || proposeMutation.isPending}
              onClick={() => proposeMutation.mutate()}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {proposeMutation.isPending ? "Submitting..." : "Propose Action"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
