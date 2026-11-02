"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Sliders,
  CheckCircle2,
  AlertCircle,
  BarChart3,
  Edit3,
  RotateCcw,
  User,
  Filter,
} from "lucide-react";
import { api } from "@/lib/api/client";
import type { CalibrationReviewItem, CalibrationDistribution, Department, ReviewCycle } from "@/lib/api/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusChip } from "@/components/shared/StatusChip";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function CalibrationPage() {
  const queryClient = useQueryClient();

  // Filters
  const [cycleId, setCycleId] = useState("");
  const [departmentId, setDepartmentId] = useState("");

  // Adjustment Modal
  const [selectedReview, setSelectedReview] = useState<CalibrationReviewItem | null>(null);
  const [calibratedRating, setCalibratedRating] = useState<number>(4);
  const [calibrationComment, setCalibrationComment] = useState("");
  const [modalError, setModalError] = useState<string | null>(null);

  // Reopen Modal
  const [reopenReview, setReopenReview] = useState<CalibrationReviewItem | null>(null);
  const [reopenComment, setReopenComment] = useState("");

  // Queries
  const { data: cycles } = useQuery({
    queryKey: ["review-cycles"],
    queryFn: () => api.reviewCycles.list(),
  });

  const { data: departments } = useQuery({
    queryKey: ["departments"],
    queryFn: () => api.departments.list(),
  });

  const {
    data: reviewsData,
    isLoading: reviewsLoading,
    error: reviewsError,
    refetch,
  } = useQuery({
    queryKey: ["calibration-reviews", { cycle: cycleId, department: departmentId }],
    queryFn: () =>
      api.calibration.getReviews({
        cycle: cycleId || undefined,
        department: departmentId || undefined,
      }),
  });

  const { data: distributionData } = useQuery({
    queryKey: ["calibration-distribution", { cycle: cycleId }],
    queryFn: () => api.calibration.getDistribution({ cycle: cycleId || undefined }),
  });

  // Mutations
  const proposeMutation = useMutation({
    mutationFn: ({ id, rating, comment }: { id: string; rating: number; comment: string }) =>
      api.calibration.propose(id, { calibrated_rating: rating, comment }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calibration-reviews"] });
      queryClient.invalidateQueries({ queryKey: ["calibration-distribution"] });
      setSelectedReview(null);
      setCalibrationComment("");
      setModalError(null);
    },
    onError: (err: any) => {
      setModalError(err.message || "Failed to update calibrated rating.");
    },
  });

  const finalizeMutation = useMutation({
    mutationFn: ({ id, rating, comment }: { id: string; rating: number; comment: string }) =>
      api.calibration.finalize(id, { final_rating: rating, comment }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calibration-reviews"] });
      queryClient.invalidateQueries({ queryKey: ["calibration-distribution"] });
      setSelectedReview(null);
      setCalibrationComment("");
      setModalError(null);
    },
    onError: (err: any) => {
      setModalError(err.message || "Failed to finalize rating.");
    },
  });

  const reopenMutation = useMutation({
    mutationFn: ({ id, comment }: { id: string; comment: string }) =>
      api.calibration.reopen(id, comment),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calibration-reviews"] });
      setReopenReview(null);
      setReopenComment("");
    },
  });

  const openAdjustDialog = (review: CalibrationReviewItem) => {
    setSelectedReview(review);
    setCalibratedRating(review.proposed_calibrated_rating || review.manager_rating || 3);
    setCalibrationComment(review.calibration_comment || "");
    setModalError(null);
  };

  const reviews: CalibrationReviewItem[] = Array.isArray(reviewsData) ? reviewsData : [];
  const distributionGroups = distributionData?.groups || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Performance Calibration</h1>
          <p className="text-sm text-slate-500 mt-1">
            Harmonize ratings across managers, adjust proposed scores, and eliminate grading bias.
          </p>
        </div>
      </div>

      {/* Filter Row */}
      <Card>
        <CardContent className="p-4 flex flex-col sm:flex-row items-center gap-3">
          <div className="w-full sm:w-64">
            <select
              value={cycleId}
              onChange={(e) => setCycleId(e.target.value)}
              className="w-full h-9 px-3 rounded-md border border-slate-300 bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600"
            >
              <option value="">All Review Cycles</option>
              {cycles?.map((c: ReviewCycle) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.status})
                </option>
              ))}
            </select>
          </div>

          <div className="w-full sm:w-64">
            <select
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              className="w-full h-9 px-3 rounded-md border border-slate-300 bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600"
            >
              <option value="">All Departments</option>
              {departments?.map((d: Department) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Distribution Visualization Card */}
      {distributionGroups.length > 0 && (
        <Card>
          <CardHeader className="p-4 pb-2 border-b border-slate-100 flex flex-row items-center justify-between">
            <div className="flex items-center space-x-2">
              <BarChart3 className="w-4 h-4 text-indigo-600" />
              <CardTitle className="text-sm font-semibold text-slate-900">Rating Distribution by Department</CardTitle>
            </div>
            <span className="text-[11px] text-slate-500">1 (Low) to 5 (Outstanding)</span>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {distributionGroups.map((g: any) => (
                <div key={g.label} className="p-3 rounded-lg border border-slate-200 bg-slate-50/50 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-900">{g.label}</span>
                    <span className="text-slate-500">
                      Mean: <strong className="text-indigo-600">{g.mean}</strong> / 5.0
                    </span>
                  </div>
                  <div className="flex items-end justify-between h-16 pt-2 gap-1.5 px-2">
                    {["1", "2", "3", "4", "5"].map((rating) => {
                      const count = g.counts[rating] || 0;
                      const heightPct = g.total > 0 ? (count / g.total) * 100 : 0;
                      return (
                        <div key={rating} className="flex-1 flex flex-col items-center h-full justify-end">
                          <span className="text-[9px] font-bold text-slate-600 mb-0.5">{count}</span>
                          <div
                            className="w-full bg-indigo-500 hover:bg-indigo-600 rounded-t transition-all"
                            style={{ height: `${Math.max(12, heightPct)}%` }}
                            title={`Rating ${rating}: ${count} reviews`}
                          />
                          <span className="text-[10px] text-slate-400 mt-1 font-mono">L{rating}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Calibration Table */}
      {reviewsLoading ? (
        <LoadingState rows={6} />
      ) : reviewsError ? (
        <ErrorState message="Failed to load calibration review records." onRetry={() => refetch()} />
      ) : reviews.length === 0 ? (
        <EmptyState
          title="No reviews in calibration"
          description="Reviews will appear here once managers complete their evaluations or cycles transition to calibration."
        />
      ) : (
        <Card>
          {/* Desktop Table (lg:block, hidden on mobile/tablet) */}
          <div className="hidden lg:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-56">Employee</TableHead>
                  <TableHead>Manager</TableHead>
                  <TableHead>Self Rating</TableHead>
                  <TableHead>Manager Rating</TableHead>
                  <TableHead>Goal Score</TableHead>
                  <TableHead>Proposed Calibrated</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reviews.map((r) => (
                  <TableRow key={r.id} className="hover:bg-slate-50/75">
                    <TableCell className="font-medium text-xs">
                      <span className="font-bold text-slate-900 block">{r.employee.name}</span>
                      <span className="text-slate-400 font-mono text-[10px]">{r.employee.employee_code} · {r.employee.department}</span>
                    </TableCell>
                    <TableCell className="text-xs text-slate-700">
                      {r.manager?.name || <span className="text-slate-400">—</span>}
                    </TableCell>
                    <TableCell className="text-xs text-slate-700">
                      {r.self_rating ? `${r.self_rating} / 5` : <span className="text-slate-400">—</span>}
                    </TableCell>
                    <TableCell className="text-xs text-slate-700">
                      {r.manager_rating ? `${r.manager_rating} / 5` : <span className="text-slate-400">—</span>}
                    </TableCell>
                    <TableCell className="text-xs text-slate-700 font-mono">
                      {r.goal_score ? `${r.goal_score}` : "—"}
                    </TableCell>
                    <TableCell className="text-xs font-bold text-indigo-600">
                      {r.calibrated_rating || r.proposed_calibrated_rating
                        ? `${r.calibrated_rating || r.proposed_calibrated_rating} / 5`
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <StatusChip status={r.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openAdjustDialog(r)}
                          className="h-8 px-2 text-xs text-indigo-600 hover:bg-indigo-50 border-indigo-200"
                        >
                          <Edit3 className="w-3.5 h-3.5 mr-1" />
                          Adjust
                        </Button>
                        {r.has_dispute && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setReopenReview(r)}
                            className="h-8 px-2 text-xs text-amber-600 hover:bg-amber-50"
                            title="Reopen Disputed Review"
                          >
                            <RotateCcw className="w-3.5 h-3.5 mr-1" />
                            Reopen
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile & Tablet Stacked Cards (< lg) */}
          <div className="block lg:hidden divide-y divide-slate-100">
            {reviews.map((r) => (
              <div key={r.id} className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-bold text-slate-900 text-sm block">{r.employee.name}</span>
                    <span className="text-[11px] text-slate-500 font-mono">
                      {r.employee.employee_code} · {r.employee.department}
                    </span>
                  </div>
                  <StatusChip status={r.status} />
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase">Self</span>
                    <span className="font-bold text-slate-800">{r.self_rating ? `${r.self_rating}/5` : "—"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase">Manager</span>
                    <span className="font-bold text-slate-800">{r.manager_rating ? `${r.manager_rating}/5` : "—"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase">Calibrated</span>
                    <span className="font-bold text-indigo-600">
                      {r.calibrated_rating || r.proposed_calibrated_rating
                        ? `${r.calibrated_rating || r.proposed_calibrated_rating}/5`
                        : "—"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-slate-500">
                    Evaluator: <strong>{r.manager?.name || "Manager"}</strong>
                  </span>
                  <div className="flex items-center space-x-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openAdjustDialog(r)}
                      className="h-8 px-2.5 text-xs text-indigo-600 border-indigo-200"
                    >
                      <Edit3 className="w-3.5 h-3.5 mr-1" />
                      Adjust
                    </Button>
                    {r.has_dispute && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setReopenReview(r)}
                        className="h-8 px-2 text-xs text-amber-600"
                      >
                        <RotateCcw className="w-3.5 h-3.5 mr-1" />
                        Reopen
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Adjust Rating Modal */}
      {selectedReview && (
        <Dialog open={!!selectedReview} onOpenChange={() => setSelectedReview(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Calibrate Rating: {selectedReview.employee.name}</DialogTitle>
              <DialogDescription>
                Department: {selectedReview.employee.department} · Evaluator: {selectedReview.manager?.name || "Manager"}
              </DialogDescription>
            </DialogHeader>

            {modalError && (
              <div className="p-2.5 rounded bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
                {modalError}
              </div>
            )}

            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4 p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-500 block">Self Rating:</span>
                  <span className="font-bold text-slate-900">{selectedReview.self_rating || "—"} / 5</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Manager Rating:</span>
                  <span className="font-bold text-slate-900">{selectedReview.manager_rating || "—"} / 5</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Calibrated Rating (1 to 5) *</label>
                <div className="flex space-x-2">
                  {[1, 2, 3, 4, 5].map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setCalibratedRating(lvl)}
                      className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-all ${
                        calibratedRating === lvl
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                          : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Calibration Committee Note *</label>
                <textarea
                  placeholder="Justification for calibrated rating adjustment..."
                  rows={3}
                  value={calibrationComment}
                  onChange={(e) => setCalibrationComment(e.target.value)}
                  className="w-full p-2.5 rounded-md border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  required
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setSelectedReview(null)}>
                Cancel
              </Button>
              <Button
                variant="outline"
                disabled={!calibrationComment.trim() || proposeMutation.isPending}
                onClick={() =>
                  proposeMutation.mutate({
                    id: selectedReview.id,
                    rating: calibratedRating,
                    comment: calibrationComment,
                  })
                }
              >
                Save Proposal
              </Button>
              <Button
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
                disabled={!calibrationComment.trim() || finalizeMutation.isPending}
                onClick={() =>
                  finalizeMutation.mutate({
                    id: selectedReview.id,
                    rating: calibratedRating,
                    comment: calibrationComment,
                  })
                }
              >
                {finalizeMutation.isPending ? "Finalizing..." : "Finalize Rating"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Reopen Dispute Modal */}
      {reopenReview && (
        <Dialog open={!!reopenReview} onOpenChange={() => setReopenReview(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reopen Disputed Review?</DialogTitle>
              <DialogDescription>
                Reopening moves this review back to Calibration status for reassessment.
              </DialogDescription>
            </DialogHeader>

            <div className="py-2 space-y-2">
              <label className="text-xs font-semibold text-slate-700">Reason for Reopening</label>
              <textarea
                placeholder="Explain the review dispute committee rationale..."
                rows={3}
                value={reopenComment}
                onChange={(e) => setReopenComment(e.target.value)}
                className="w-full p-2.5 rounded-md border border-slate-300 text-xs text-slate-900"
              />
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setReopenReview(null)}>
                Cancel
              </Button>
              <Button
                disabled={!reopenComment.trim() || reopenMutation.isPending}
                onClick={() =>
                  reopenMutation.mutate({
                    id: reopenReview.id,
                    comment: reopenComment,
                  })
                }
              >
                Confirm Reopen
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
