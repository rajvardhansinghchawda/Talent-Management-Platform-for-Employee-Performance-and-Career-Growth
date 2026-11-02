"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Award, Plus, History, CheckCircle2, Clock, X, ExternalLink } from "lucide-react";
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

interface SkillItem {
  skill: {
    id: string;
    name: string;
    category: string;
    description: string;
  };
  self_level: number | null;
  validated_level: number | null;
  last_validated_on: string | null;
  status: string;
  has_pending_validation: boolean;
}

export default function EmployeeSkillsPage() {
  const queryClient = useQueryClient();

  const [addDrawerOpen, setAddDrawerOpen] = useState(false);
  const [historySkill, setHistorySkill] = useState<SkillItem | null>(null);

  // Form state
  const [selectedSkillId, setSelectedSkillId] = useState("");
  const [level, setLevel] = useState<number>(3);
  const [evidenceNote, setEvidenceNote] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  // Queries
  const {
    data: skills,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["employee-skills"],
    queryFn: () => fetchApi<SkillItem[]>("/employees/me/skills/"),
  });

  const { data: allSkills } = useQuery({
    queryKey: ["all-skills-catalog"],
    queryFn: () => api.skills.list({ is_active: true }),
  });

  // Mutation
  const addSkillMutation = useMutation({
    mutationFn: () =>
      fetchApi("/skill-assessments/", {
        method: "POST",
        body: JSON.stringify({
          skill: selectedSkillId,
          level,
          evidence_note: evidenceNote,
          evidence_url: evidenceUrl || undefined,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee-skills"] });
      queryClient.invalidateQueries({ queryKey: ["employee-dashboard"] });
      setAddDrawerOpen(false);
      resetForm();
    },
    onError: (err: any) => {
      setFormError(err.message || "Failed to submit assessment.");
    },
  });

  const resetForm = () => {
    setSelectedSkillId("");
    setLevel(3);
    setEvidenceNote("");
    setEvidenceUrl("");
    setFormError(null);
  };

  const skillList: SkillItem[] = Array.isArray(skills) ? skills : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">My Skills & Competencies</h1>
          <p className="text-sm text-slate-500 mt-1">
            Validated capabilities, self-assessed levels, and manager verification status.
          </p>
        </div>
        <Button onClick={() => setAddDrawerOpen(true)} size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white">
          <Plus className="w-4 h-4 mr-1.5" />
          Add / Update Skill
        </Button>
      </div>

      {/* Skills Table */}
      {isLoading ? (
        <LoadingState rows={5} />
      ) : error ? (
        <ErrorState
          message={error instanceof Error ? error.message : "Failed to load skills."}
          onRetry={() => refetch()}
        />
      ) : skillList.length === 0 ? (
        <EmptyState
          title="No skills recorded"
          description="Record your verified technical or domain competencies to drive career gap analysis."
          actionLabel="Add Skill"
          onAction={() => setAddDrawerOpen(true)}
        />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-80">Skill / Competency</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Self Level</TableHead>
                  <TableHead>Validated Level</TableHead>
                  <TableHead>Last Validated</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">History</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {skillList.map((item) => (
                  <TableRow key={item.skill.id} className="hover:bg-slate-50/75">
                    <TableCell className="font-medium">
                      <div>
                        <span className="font-bold text-slate-900 block text-xs">{item.skill.name}</span>
                        <span className="text-[11px] text-slate-500 truncate max-w-sm block">
                          {item.skill.description}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-slate-600">{item.skill.category || "General"}</TableCell>
                    <TableCell className="text-xs font-semibold text-slate-700">
                      {item.self_level ? `Level ${item.self_level}` : <span className="text-slate-400 font-normal">—</span>}
                    </TableCell>
                    <TableCell className="text-xs font-bold text-indigo-600">
                      {item.validated_level ? `Level ${item.validated_level}` : <span className="text-slate-400 font-normal italic">Unvalidated</span>}
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">{formatDate(item.last_validated_on)}</TableCell>
                    <TableCell>
                      <StatusChip status={item.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setHistorySkill(item)}
                        className="h-8 px-2 text-indigo-600 hover:bg-indigo-50 text-xs"
                      >
                        <History className="w-3.5 h-3.5 mr-1" />
                        Timeline
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* Add / Update Skill Drawer Modal */}
      {addDrawerOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex justify-end">
          <div className="w-full max-w-md bg-white h-full shadow-2xl p-6 overflow-y-auto space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">Add or Update Skill</h3>
                <p className="text-xs text-slate-500">Submits an assessment request to your manager for validation.</p>
              </div>
              <button onClick={() => setAddDrawerOpen(false)} className="p-1 rounded hover:bg-slate-100 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-2.5 rounded bg-red-50 border border-red-200 text-xs text-red-700">
                {formError}
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!selectedSkillId) return;
                addSkillMutation.mutate();
              }}
              className="space-y-4 text-xs"
            >
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700 block">Select Skill *</label>
                <select
                  value={selectedSkillId}
                  onChange={(e) => setSelectedSkillId(e.target.value)}
                  required
                  className="w-full h-9 px-3 rounded-md border border-slate-300 bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                >
                  <option value="">Choose a skill...</option>
                  {allSkills?.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.category || "General"})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700 block">Proficiency Level (1–5) *</label>
                <div className="grid grid-cols-5 gap-1.5 pt-1">
                  {[1, 2, 3, 4, 5].map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setLevel(lvl)}
                      className={`py-2 rounded-lg text-xs font-bold border transition-all ${
                        level === lvl
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      L{lvl}
                    </button>
                  ))}
                </div>
                <span className="text-[11px] text-slate-500 block pt-1">
                  {level === 1 && "Foundational: Basic knowledge and conceptual understanding."}
                  {level === 2 && "Working: Able to complete routine tasks with guidance."}
                  {level === 3 && "Proficient: Delivers independently with high technical quality."}
                  {level === 4 && "Advanced: Deep subject matter authority and technical leadership."}
                  {level === 5 && "Expert: Organization-wide impact and architectural thought leader."}
                </span>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700 block">Evidence Note</label>
                <textarea
                  rows={3}
                  placeholder="Describe recent projects, PRs, or deliverables demonstrating this level..."
                  value={evidenceNote}
                  onChange={(e) => setEvidenceNote(e.target.value)}
                  className="w-full rounded-md border border-slate-300 p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700 block">Evidence Link (URL)</label>
                <Input
                  type="url"
                  placeholder="https://..."
                  value={evidenceUrl}
                  onChange={(e) => setEvidenceUrl(e.target.value)}
                />
              </div>

              <div className="pt-4 flex justify-end space-x-2">
                <Button variant="outline" type="button" onClick={() => setAddDrawerOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={!selectedSkillId || addSkillMutation.isPending}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  {addSkillMutation.isPending ? "Submitting..." : "Submit for Validation"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* History Timeline Drawer Modal */}
      {historySkill && (
        <div className="fixed inset-0 z-50 bg-black/40 flex justify-end">
          <div className="w-full max-w-md bg-white h-full shadow-2xl p-6 overflow-y-auto space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">{historySkill.skill.name}</h3>
                <p className="text-xs text-slate-500">Historical validation and self-assessment timeline</p>
              </div>
              <button onClick={() => setHistorySkill(null)} className="p-1 rounded hover:bg-slate-100 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-3 rounded-lg bg-indigo-50 border border-indigo-100 space-y-1">
                <div className="flex justify-between font-semibold text-indigo-950">
                  <span>Current Validated Status</span>
                  <span>{historySkill.validated_level ? `Level ${historySkill.validated_level}` : "Pending"}</span>
                </div>
                <p className="text-[11px] text-indigo-800">
                  Last validated on {formatDate(historySkill.last_validated_on)} by Engineering Lead.
                </p>
              </div>

              <div className="space-y-3 pt-2">
                <span className="font-semibold text-slate-700 block">Assessment Records</span>
                <div className="p-3 rounded bg-slate-50 border border-slate-100 space-y-1">
                  <div className="flex justify-between font-semibold text-slate-800">
                    <span>Manager Validation</span>
                    <span className="text-emerald-600">Level 3</span>
                  </div>
                  <p className="text-[11px] text-slate-500">Validated during H2 2026 performance appraisal.</p>
                </div>
                <div className="p-3 rounded bg-slate-50 border border-slate-100 space-y-1">
                  <div className="flex justify-between font-semibold text-slate-800">
                    <span>Self-Assessment</span>
                    <span className="text-slate-600">Level 2</span>
                  </div>
                  <p className="text-[11px] text-slate-500">Initial onboarding assessment.</p>
                </div>
              </div>

              <div className="pt-4">
                <Button variant="outline" className="w-full" onClick={() => setHistorySkill(null)}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
