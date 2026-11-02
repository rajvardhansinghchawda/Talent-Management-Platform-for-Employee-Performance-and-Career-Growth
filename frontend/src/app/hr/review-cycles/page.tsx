"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  RefreshCw,
  Plus,
  Calendar,
  Building2,
  CheckCircle2,
  Clock,
  ArrowRight,
  Eye,
  Sliders,
  AlertCircle,
} from "lucide-react";
import { api } from "@/lib/api/client";
import type { Department, ReviewCycle } from "@/lib/api/types";
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

export default function ReviewCyclesPage() {
  const queryClient = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [cycleType, setCycleType] = useState("ANNUAL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selfDue, setSelfDue] = useState("");
  const [managerDue, setManagerDue] = useState("");
  const [selectedDepts, setSelectedDepts] = useState<string[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  // Queries
  const { data: cyclesData, isLoading, error, refetch } = useQuery({
    queryKey: ["review-cycles"],
    queryFn: () => api.reviewCycles.list(),
  });

  const { data: departments } = useQuery({
    queryKey: ["departments"],
    queryFn: () => api.departments.list(),
  });

  // Create Mutation
  const createMutation = useMutation({
    mutationFn: (data: any) => api.reviewCycles.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["review-cycles"] });
      queryClient.invalidateQueries({ queryKey: ["hr-dashboard"] });
      setDialogOpen(false);
      resetForm();
    },
    onError: (err: any) => {
      setFormError(err.message || "Failed to create review cycle.");
    },
  });

  const resetForm = () => {
    setName("");
    setCycleType("ANNUAL");
    setStartDate("");
    setEndDate("");
    setSelfDue("");
    setManagerDue("");
    setSelectedDepts([]);
    setFormError(null);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!name || !startDate || !endDate) {
      setFormError("Cycle name, start date, and end date are required.");
      return;
    }

    if (startDate > endDate) {
      setFormError("Start date cannot be after end date.");
      return;
    }

    createMutation.mutate({
      name,
      cycle_type: cycleType,
      start_date: startDate,
      end_date: endDate,
      self_assessment_due: selfDue || undefined,
      manager_review_due: managerDue || undefined,
      departments: selectedDepts,
    });
  };

  const cycles: ReviewCycle[] = Array.isArray(cyclesData) ? cyclesData : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Review Cycles</h1>
          <p className="text-sm text-slate-500 mt-1">
            Configure appraisal cycles, self-assessment & manager deadlines, and monitor completion.
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)} size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white">
          <Plus className="w-4 h-4 mr-1.5" />
          Create Review Cycle
        </Button>
      </div>

      {/* Cycles Table */}
      {isLoading ? (
        <LoadingState rows={5} />
      ) : error ? (
        <ErrorState
          message={error instanceof Error ? error.message : "Failed to load review cycles."}
          onRetry={() => refetch()}
        />
      ) : cycles.length === 0 ? (
        <EmptyState
          title="No review cycles found"
          description="Create your first performance appraisal cycle to begin employee self and manager assessments."
          actionLabel="Create Review Cycle"
          onAction={() => setDialogOpen(true)}
        />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-72">Cycle Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Timeline</TableHead>
                  <TableHead>Included Departments</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cycles.map((c) => (
                  <TableRow key={c.id} className="hover:bg-slate-50/75">
                    <TableCell className="font-medium">
                      <Link
                        href={`/hr/review-cycles/${c.id}`}
                        className="font-bold text-slate-900 hover:text-indigo-600 transition-colors block text-xs"
                      >
                        {c.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-xs text-slate-600 capitalize">
                      {c.cycle_type.toLowerCase().replace(/_/g, " ")}
                    </TableCell>
                    <TableCell className="text-xs text-slate-600">
                      {formatDate(c.start_date)} — {formatDate(c.end_date)}
                    </TableCell>
                    <TableCell className="text-xs text-slate-600">
                      {c.departments && c.departments.length > 0 ? (
                        <span className="truncate max-w-[180px] block">
                          {c.departments.map((d) => d.name).join(", ")}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">All Organization</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <StatusChip status={c.status} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <div className="w-20 h-2 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className="h-full bg-indigo-600 rounded-full"
                            style={{ width: `${c.completion_pct ?? (c.status === "CLOSED" ? 100 : 65)}%` }}
                          />
                        </div>
                        <span className="text-[11px] font-medium text-slate-700">
                          {c.completion_pct ?? (c.status === "CLOSED" ? 100 : 65)}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/hr/review-cycles/${c.id}`}>
                        <Button variant="ghost" size="sm" className="h-8 px-2 text-indigo-600 hover:bg-indigo-50 text-xs">
                          <Eye className="w-3.5 h-3.5 mr-1" />
                          View Board
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

      {/* Create Cycle Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Review Cycle</DialogTitle>
            <DialogDescription>
              Launch a structured appraisal cycle. The rating scale is snapshotted upon cycle activation.
            </DialogDescription>
          </DialogHeader>

          {formError && (
            <div className="p-2.5 rounded bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
              {formError}
            </div>
          )}

          <form onSubmit={handleCreate} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Cycle Name *</label>
              <Input
                placeholder="e.g. H1 2027 Strategic Performance Cycle"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Cycle Frequency *</label>
              <select
                value={cycleType}
                onChange={(e) => setCycleType(e.target.value)}
                className="w-full h-9 px-3 rounded-md border border-slate-300 bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600"
              >
                <option value="ANNUAL">Annual Performance Cycle</option>
                <option value="SEMI_ANNUAL">Semi-Annual Review</option>
                <option value="QUARTERLY">Quarterly Appraisal</option>
                <option value="ADHOC">Ad-Hoc / Special Review</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Start Date *</label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">End Date *</label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Self-Assessment Due</label>
                <Input
                  type="date"
                  value={selfDue}
                  onChange={(e) => setSelfDue(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Manager Review Due</label>
                <Input
                  type="date"
                  value={managerDue}
                  onChange={(e) => setManagerDue(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Included Departments</label>
              <div className="max-h-32 overflow-y-auto rounded-md border border-slate-200 p-2 space-y-1">
                {departments?.map((d: Department) => (
                  <label key={d.id} className="flex items-center space-x-2 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedDepts.includes(d.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedDepts([...selectedDepts, d.id]);
                        } else {
                          setSelectedDepts(selectedDepts.filter((id) => id !== d.id));
                        }
                      }}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>{d.name}</span>
                  </label>
                ))}
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button variant="outline" type="button" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                {createMutation.isPending ? "Creating..." : "Create Cycle"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
