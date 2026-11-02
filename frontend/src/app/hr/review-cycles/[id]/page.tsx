"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Play,
  Sliders,
  CheckCircle,
  AlertTriangle,
  Clock,
  Send,
  Building2,
  Calendar,
  Layers,
  User,
} from "lucide-react";
import { api } from "@/lib/api/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusChip } from "@/components/shared/StatusChip";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { formatDate } from "@/lib/utils";

export default function ReviewCycleDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const queryClient = useQueryClient();

  // Dialog states for action consequences
  const [confirmAction, setConfirmAction] = useState<"activate" | "calibrate" | "close" | null>(null);

  // Queries
  const { data: cycle, isLoading: cycleLoading, error: cycleError } = useQuery({
    queryKey: ["review-cycle", id],
    queryFn: () => api.reviewCycles.get(id),
  });

  const { data: boardData, isLoading: boardLoading } = useQuery({
    queryKey: ["review-cycle-board", id],
    queryFn: () => api.reviewCycles.getBoard(id),
  });

  const { data: overdueData } = useQuery({
    queryKey: ["review-cycle-overdue", id],
    queryFn: () => api.reviewCycles.getOverdue(id),
  });

  // Action Mutations
  const activateMutation = useMutation({
    mutationFn: () => api.reviewCycles.activate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["review-cycle", id] });
      queryClient.invalidateQueries({ queryKey: ["review-cycle-board", id] });
      setConfirmAction(null);
    },
  });

  const calibrateMutation = useMutation({
    mutationFn: () => api.reviewCycles.startCalibration(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["review-cycle", id] });
      queryClient.invalidateQueries({ queryKey: ["review-cycle-board", id] });
      setConfirmAction(null);
    },
  });

  const closeMutation = useMutation({
    mutationFn: () => api.reviewCycles.close(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["review-cycle", id] });
      queryClient.invalidateQueries({ queryKey: ["review-cycle-board", id] });
      setConfirmAction(null);
    },
  });

  if (cycleLoading || boardLoading) return <LoadingState rows={8} />;
  if (cycleError || !cycle) {
    return <ErrorState message="Review cycle not found." />;
  }

  const columns = boardData?.columns || [];
  const overdueList = overdueData || [];

  return (
    <div className="space-y-6">
      {/* Back button */}
      <div>
        <Link href="/hr/review-cycles">
          <Button variant="ghost" size="sm" className="h-8 px-2 text-slate-500 hover:text-slate-900">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Review Cycles
          </Button>
        </Link>
      </div>

      {/* Cycle Header Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center space-x-3">
                <h1 className="text-xl font-bold text-slate-900">{cycle.name}</h1>
                <StatusChip status={cycle.status} />
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                <span className="flex items-center">
                  <Calendar className="w-3.5 h-3.5 mr-1 text-slate-400" />
                  {formatDate(cycle.start_date)} — {formatDate(cycle.end_date)}
                </span>
                <span>·</span>
                <span className="flex items-center">
                  <Building2 className="w-3.5 h-3.5 mr-1 text-slate-400" />
                  {cycle.departments && cycle.departments.length > 0
                    ? cycle.departments.map((d: any) => d.name).join(", ")
                    : "All Organization"}
                </span>
              </div>
            </div>

            {/* Lifecycle State Actions */}
            <div className="flex items-center space-x-2">
              {cycle.status === "DRAFT" && (
                <Button
                  size="sm"
                  onClick={() => setConfirmAction("activate")}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                >
                  <Play className="w-3.5 h-3.5 mr-1.5" />
                  Activate Cycle
                </Button>
              )}
              {cycle.status === "ACTIVE" && (
                <Button
                  size="sm"
                  onClick={() => setConfirmAction("calibrate")}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs"
                >
                  <Sliders className="w-3.5 h-3.5 mr-1.5" />
                  Start Calibration
                </Button>
              )}
              {cycle.status === "CALIBRATION" && (
                <Button
                  size="sm"
                  onClick={() => setConfirmAction("close")}
                  className="bg-slate-900 hover:bg-black text-white text-xs"
                >
                  <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
                  Close & Lock Cycle
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Kanban Board */}
      <div>
        <h2 className="text-base font-bold text-slate-900 mb-3">Appraisal Progress Board</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3.5 overflow-x-auto">
          {columns.map((col: any) => (
            <div key={col.status} className="bg-slate-100/70 rounded-xl p-3 flex flex-col min-w-[200px]">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200">
                <span className="text-xs font-bold text-slate-800">{col.title}</span>
                <span className="text-[11px] font-semibold bg-white text-slate-700 px-1.5 py-0.5 rounded-full border border-slate-200 shadow-xs">
                  {col.count}
                </span>
              </div>

              <div className="space-y-2 flex-1 overflow-y-auto max-h-[500px]">
                {col.cards.length === 0 ? (
                  <p className="text-[11px] text-slate-400 text-center py-6 italic">No reviews</p>
                ) : (
                  col.cards.map((card: any) => (
                    <Card key={card.id} className="p-3 shadow-xs hover:border-indigo-300 transition-colors bg-white">
                      <div className="space-y-1">
                        <span className="font-semibold text-xs text-slate-900 block">{card.employee_name}</span>
                        <span className="text-[10px] text-slate-500 font-mono block">{card.employee_code}</span>
                        <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-100">
                          <span>{card.department}</span>
                          <span className="text-indigo-600 font-medium">{card.reviewer_name || "Manager"}</span>
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Overdue Reviews Panel */}
      {overdueList.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/20">
          <CardHeader className="p-4 pb-2 border-b border-amber-100 flex flex-row items-center justify-between">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-amber-600" />
              <CardTitle className="text-sm font-bold text-amber-900">
                Overdue Stage Submissions ({overdueList.length})
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            <div className="space-y-2">
              {overdueList.map((item: any) => (
                <div key={item.id} className="p-2.5 rounded-lg bg-white border border-amber-200 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-slate-900">{item.employee_name}</span>
                    <span className="text-slate-500 text-[11px] ml-2">({item.department})</span>
                    <p className="text-[11px] text-amber-700 mt-0.5">
                      Pending: {item.stage.replace(/_/g, " ")} · Assigned: {item.reviewer_name || "Employee"}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" className="h-7 text-xs bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100">
                    <Send className="w-3 h-3 mr-1" />
                    Send Reminder
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Confirmation Dialogs for Cycle State Transitions */}
      {confirmAction === "activate" && (
        <ConfirmDialog
          open={confirmAction === "activate"}
          onOpenChange={(open) => !open && setConfirmAction(null)}
          title="Activate Review Cycle?"
          description="Activating this cycle snapshots the organization's rating scale, generates review records for all active employees across included departments, and sends email notifications."
          confirmLabel="Activate Cycle"
          variant="default"
          loading={activateMutation.isPending}
          onConfirm={() => activateMutation.mutate()}
        />
      )}

      {confirmAction === "calibrate" && (
        <ConfirmDialog
          open={confirmAction === "calibrate"}
          onOpenChange={(open) => !open && setConfirmAction(null)}
          title="Transition Cycle to Calibration?"
          description="Moving to Calibration locks manager reviews and allows HR and department leaders to adjust ratings and harmonize distributions."
          confirmLabel="Start Calibration"
          variant="default"
          loading={calibrateMutation.isPending}
          onConfirm={() => calibrateMutation.mutate()}
        />
      )}

      {confirmAction === "close" && (
        <ConfirmDialog
          open={confirmAction === "close"}
          onOpenChange={(open) => !open && setConfirmAction(null)}
          title="Close and Lock Review Cycle?"
          description="Closing the cycle permanently locks all finalized ratings and performance scores, writes audit entries, and releases final outcomes to employee profiles."
          confirmLabel="Close & Lock"
          variant="destructive"
          loading={closeMutation.isPending}
          onConfirm={() => closeMutation.mutate()}
        />
      )}
    </div>
  );
}
