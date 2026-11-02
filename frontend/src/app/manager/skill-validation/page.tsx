"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Award,
  CheckCircle2,
  XCircle,
  FileCheck,
  Search,
  CheckCheck,
  ExternalLink,
  ShieldAlert,
} from "lucide-react";
import { api } from "@/lib/api/client";
import type { SkillAssessmentQueueItem } from "@/lib/api/types";
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

export default function SkillValidationPage() {
  const queryClient = useQueryClient();

  // Validate Modal
  const [validateItem, setValidateItem] = useState<SkillAssessmentQueueItem | null>(null);
  const [adjustedLevel, setAdjustedLevel] = useState<number>(3);
  const [validationNote, setValidationNote] = useState("");

  // Reject Modal
  const [rejectItem, setRejectItem] = useState<SkillAssessmentQueueItem | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  // Query pending assessments for team
  const { data: queueData, isLoading, error, refetch } = useQuery({
    queryKey: ["skill-validation-queue"],
    queryFn: () => api.manager.getSkillValidationQueue({ scope: "team", status: "PENDING" }),
  });

  // Mutations
  const validateMutation = useMutation({
    mutationFn: ({ id, level, note }: { id: string; level: number; note: string }) =>
      api.manager.validateSkill(id, { adjusted_level: level, note }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["skill-validation-queue"] });
      queryClient.invalidateQueries({ queryKey: ["manager-dashboard"] });
      setValidateItem(null);
      setValidationNote("");
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      api.manager.rejectSkill(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["skill-validation-queue"] });
      queryClient.invalidateQueries({ queryKey: ["manager-dashboard"] });
      setRejectItem(null);
      setRejectionReason("");
    },
  });

  const bulkValidateMutation = useMutation({
    mutationFn: (ids: string[]) => api.manager.bulkValidateSkills(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["skill-validation-queue"] });
      queryClient.invalidateQueries({ queryKey: ["manager-dashboard"] });
    },
  });

  const queue: SkillAssessmentQueueItem[] = Array.isArray(queueData) ? queueData : ((queueData as any)?.results || []);

  const openValidateModal = (item: SkillAssessmentQueueItem) => {
    setValidateItem(item);
    setAdjustedLevel(item.level);
    setValidationNote("");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Skill Validation Queue</h1>
          <p className="text-sm text-slate-500 mt-1">
            Review self-reported competency claims, inspect submitted evidence, and confirm validated proficiency levels.
          </p>
        </div>
        {queue.length > 0 && (
          <Button
            size="sm"
            onClick={() => bulkValidateMutation.mutate(queue.map((q) => q.id))}
            disabled={bulkValidateMutation.isPending}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
          >
            <CheckCheck className="w-3.5 h-3.5 mr-1.5" />
            Bulk Validate All ({queue.length})
          </Button>
        )}
      </div>

      {/* Queue Table */}
      {isLoading ? (
        <LoadingState rows={5} />
      ) : error ? (
        <ErrorState message="Failed to load skill validation queue." onRetry={() => refetch()} />
      ) : queue.length === 0 ? (
        <EmptyState
          title="No pending skill validations"
          description="Your team's competency assessments are up to date. New employee submissions will appear here for review."
        />
      ) : (
        <Card>
          {/* Desktop Table (md:block, hidden on mobile) */}
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-64">Employee</TableHead>
                  <TableHead>Competency Skill</TableHead>
                  <TableHead>Claimed Proficiency</TableHead>
                  <TableHead>Evidence & Notes</TableHead>
                  <TableHead>Submission Source</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {queue.map((item) => (
                  <TableRow key={item.id} className="hover:bg-slate-50/75">
                    <TableCell className="font-semibold text-xs text-slate-900">
                      <span className="block font-bold">{item.employee_name}</span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {item.employee_code} · {item.department}
                      </span>
                    </TableCell>
                    <TableCell className="font-medium text-xs text-slate-800">
                      <span className="font-bold text-slate-900 block">{item.skill_name}</span>
                      <span className="text-[10px] text-slate-400">{item.skill_category}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs font-bold text-indigo-700 bg-indigo-50 border-indigo-200">
                        Level {item.level} / 5
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-slate-600 max-w-xs">
                      {item.evidence_note ? (
                        <p className="truncate text-[11px] text-slate-700" title={item.evidence_note}>
                          {item.evidence_note}
                        </p>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">Self-assessment claim</span>
                      )}
                      {item.evidence_url && (
                        <a
                          href={item.evidence_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[10px] text-indigo-600 hover:underline flex items-center mt-0.5"
                        >
                          <ExternalLink className="w-2.5 h-2.5 mr-1" />
                          View external work artifact
                        </a>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-[10px] uppercase font-mono">
                        {item.source}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setRejectItem(item)}
                          className="h-8 px-2 text-rose-600 border-rose-200 hover:bg-rose-50 text-xs"
                        >
                          <XCircle className="w-3.5 h-3.5 mr-1" />
                          Reject
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => openValidateModal(item)}
                          className="h-8 px-2.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                          Validate
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Stacked Cards (< md) */}
          <div className="block md:hidden divide-y divide-slate-100">
            {queue.map((item) => (
              <div key={item.id} className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-bold text-slate-900 text-sm block">{item.employee_name}</span>
                    <span className="text-[11px] text-slate-500 font-mono">
                      {item.employee_code} · {item.department}
                    </span>
                  </div>
                  <Badge variant="outline" className="text-xs font-bold text-indigo-700 bg-indigo-50 border-indigo-200">
                    Level {item.level} / 5
                  </Badge>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-900">{item.skill_name}</span>
                    <Badge variant="secondary" className="text-[9px] uppercase font-mono">
                      {item.source}
                    </Badge>
                  </div>
                  {item.evidence_note && (
                    <p className="text-slate-600 text-[11px] leading-relaxed pt-0.5">{item.evidence_note}</p>
                  )}
                  {item.evidence_url && (
                    <a
                      href={item.evidence_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[10px] text-indigo-600 hover:underline flex items-center pt-1"
                    >
                      <ExternalLink className="w-2.5 h-2.5 mr-1" />
                      View external work artifact
                    </a>
                  )}
                </div>

                <div className="flex items-center justify-end space-x-2 pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setRejectItem(item)}
                    className="h-8 px-3 text-rose-600 border-rose-200 hover:bg-rose-50 text-xs flex-1 sm:flex-initial"
                  >
                    <XCircle className="w-3.5 h-3.5 mr-1" />
                    Reject
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => openValidateModal(item)}
                    className="h-8 px-3.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex-1 sm:flex-initial"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                    Validate
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Validate Modal */}
      {validateItem && (
        <Dialog open={!!validateItem} onOpenChange={() => setValidateItem(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Validate Skill: {validateItem.skill_name}</DialogTitle>
              <DialogDescription>
                Confirm proficiency level for <strong>{validateItem.employee_name}</strong>. Validated skills directly feed role readiness calculations.
              </DialogDescription>
            </DialogHeader>

            <div className="py-2 space-y-4 text-xs">
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-slate-400 font-medium block">Employee Claimed Level:</span>
                <span className="font-bold text-slate-900 text-sm">Level {validateItem.level} / 5</span>
                {validateItem.evidence_note && (
                  <p className="text-slate-600 text-[11px] pt-1 border-t border-slate-200 mt-1">
                    "{validateItem.evidence_note}"
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-900 block">Confirm or Adjust Level (1 to 5) *</label>
                <div className="flex space-x-2">
                  {[1, 2, 3, 4, 5].map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setAdjustedLevel(lvl)}
                      className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-all ${
                        adjustedLevel === lvl
                          ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                          : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-900 block">Validation Rationale Note</label>
                <textarea
                  rows={3}
                  placeholder="Notes on verified code deliverables, project demonstrations, or mentorship..."
                  value={validationNote}
                  onChange={(e) => setValidationNote(e.target.value)}
                  className="w-full p-2.5 rounded-md border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setValidateItem(null)}>
                Cancel
              </Button>
              <Button
                disabled={validateMutation.isPending}
                onClick={() =>
                  validateMutation.mutate({
                    id: validateItem.id,
                    level: adjustedLevel,
                    note: validationNote,
                  })
                }
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {validateMutation.isPending ? "Validating..." : "Confirm & Validate"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Reject Modal */}
      {rejectItem && (
        <Dialog open={!!rejectItem} onOpenChange={() => setRejectItem(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reject Skill Assessment?</DialogTitle>
              <DialogDescription>
                Provide feedback to {rejectItem.employee_name} explaining what evidence or experience is needed before validation.
              </DialogDescription>
            </DialogHeader>

            <div className="py-2 space-y-1.5 text-xs">
              <label className="font-semibold text-slate-700 block">Feedback / Reason for Rejection *</label>
              <textarea
                rows={3}
                placeholder="Detail required course completions or deliverable expectations..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full p-2.5 rounded-md border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-600"
                required
              />
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setRejectItem(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                disabled={!rejectionReason.trim() || rejectMutation.isPending}
                onClick={() =>
                  rejectMutation.mutate({
                    id: rejectItem.id,
                    reason: rejectionReason,
                  })
                }
              >
                Confirm Rejection
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
