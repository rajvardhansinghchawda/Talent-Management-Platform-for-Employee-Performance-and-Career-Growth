"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Award,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  PowerOff,
  BookOpen,
  Briefcase,
  Users,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { api } from "@/lib/api/client";
import type { Skill } from "@/lib/api/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
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

export default function SkillsPage() {
  const queryClient = useQueryClient();

  // Filter states
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");

  // Modal states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null);
  const [name, setName] = useState("");
  const [skillCategory, setSkillCategory] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);

  // Delete / Deactivate modal states
  const [deleteSkill, setDeleteSkill] = useState<Skill | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Queries
  const { data: skillsData, isLoading, error, refetch } = useQuery({
    queryKey: ["skills", { q, category }],
    queryFn: () =>
      api.skills.list({
        q: q || undefined,
        category: category || undefined,
      }),
  });

  // Mutations
  const saveMutation = useMutation({
    mutationFn: (data: { name: string; category?: string; description?: string; is_active?: boolean }) => {
      if (editingSkill) {
        return api.skills.update(editingSkill.id, data);
      }
      return api.skills.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["skills"] });
      queryClient.invalidateQueries({ queryKey: ["hr-dashboard"] });
      setDialogOpen(false);
      resetForm();
    },
    onError: (err: any) => {
      setFormError(err.message || "Failed to save skill.");
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => api.skills.deactivate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["skills"] });
      setDeleteSkill(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.skills.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["skills"] });
      setDeleteSkill(null);
      setDeleteError(null);
    },
    onError: (err: any) => {
      setDeleteError(
        err.message ||
          "Skill is currently in use across employees, roles, or courses. Deactivate it instead."
      );
    },
  });

  const resetForm = () => {
    setEditingSkill(null);
    setName("");
    setSkillCategory("");
    setDescription("");
    setIsActive(true);
    setFormError(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (skill: Skill) => {
    setEditingSkill(skill);
    setName(skill.name);
    setSkillCategory(skill.category);
    setDescription(skill.description);
    setIsActive(skill.is_active);
    setFormError(null);
    setDialogOpen(true);
  };

  const skills: Skill[] = Array.isArray(skillsData) ? skillsData : [];
  const categories = Array.from(new Set(skills.map((s) => s.category).filter(Boolean)));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Skills Library</h1>
          <p className="text-sm text-slate-500 mt-1">
            Standard competency taxonomies, role requirements, and learning course alignment.
          </p>
        </div>
        <Button onClick={openCreateDialog} size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white">
          <Plus className="w-4 h-4 mr-1.5" />
          Add Skill
        </Button>
      </div>

      {/* Filter Row */}
      <Card>
        <CardContent className="p-4 flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              placeholder="Search skill name or competency description..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>

          <div className="w-full sm:w-64">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full h-9 px-3 rounded-md border border-slate-300 bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {(q || category) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setQ("");
                setCategory("");
              }}
              className="text-xs text-slate-500 hover:text-slate-900"
            >
              Clear
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Table */}
      {isLoading ? (
        <LoadingState rows={6} />
      ) : error ? (
        <ErrorState message="Failed to load skills library." onRetry={() => refetch()} />
      ) : skills.length === 0 ? (
        <EmptyState
          title="No skills found"
          description="Add standard competencies to evaluate roles and employee skill gaps."
          actionLabel="Add Skill"
          onAction={openCreateDialog}
        />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-64">Skill Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Usage</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {skills.map((s) => (
                  <TableRow key={s.id} className="hover:bg-slate-50/75">
                    <TableCell className="font-semibold text-xs text-slate-900 flex items-center space-x-2">
                      <div className="w-6 h-6 rounded bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0">
                        <Award className="w-3.5 h-3.5" />
                      </div>
                      <span>{s.name}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs font-normal">
                        {s.category || "General"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-slate-600 max-w-xs truncate">
                      {s.description || <span className="text-slate-300 italic">—</span>}
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">
                      <div className="flex items-center space-x-3 text-[11px]">
                        <span title="Employees assessed" className="flex items-center">
                          <Users className="w-3 h-3 mr-1 text-slate-400" />
                          {s.usage?.employees ?? 0}
                        </span>
                        <span title="Roles requiring this" className="flex items-center">
                          <Briefcase className="w-3 h-3 mr-1 text-slate-400" />
                          {s.usage?.roles ?? 0}
                        </span>
                        <span title="Mapped courses" className="flex items-center">
                          <BookOpen className="w-3 h-3 mr-1 text-slate-400" />
                          {s.usage?.courses ?? 0}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={s.is_active ? "success" : "secondary"} className="text-xs">
                        {s.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(s)}
                          className="h-8 px-2 text-slate-600 hover:text-indigo-600"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setDeleteError(null);
                            setDeleteSkill(s);
                          }}
                          className="h-8 px-2 text-rose-600 hover:bg-rose-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* Add / Edit Skill Modal */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingSkill ? `Edit ${editingSkill.name}` : "Add New Skill"}</DialogTitle>
            <DialogDescription>
              Skills are required by job roles and improved through training courses.
            </DialogDescription>
          </DialogHeader>

          {formError && (
            <div className="p-2.5 rounded bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
              {formError}
            </div>
          )}

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Skill Name *</label>
              <Input
                placeholder="e.g. Distributed Caching & Redis"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Category</label>
              <Input
                placeholder="e.g. Backend, Data, Architecture, Leadership"
                value={skillCategory}
                onChange={(e) => setSkillCategory(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Description</label>
              <textarea
                placeholder="Competency definition and evaluation criteria..."
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full p-2.5 rounded-md border border-slate-300 text-xs text-slate-900"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!name.trim() || saveMutation.isPending}
              onClick={() =>
                saveMutation.mutate({
                  name,
                  category: skillCategory,
                  description,
                  is_active: isActive,
                })
              }
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {saveMutation.isPending ? "Saving..." : "Save Skill"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete / Deactivate Guard Modal */}
      {deleteSkill && (
        <Dialog open={!!deleteSkill} onOpenChange={() => setDeleteSkill(null)}>
          <DialogContent>
            <DialogHeader>
              <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mb-2">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <DialogTitle>Delete {deleteSkill.name}?</DialogTitle>
              <DialogDescription>
                Skills linked to role requirements, assessments, or courses cannot be permanently removed.
              </DialogDescription>
            </DialogHeader>

            {deleteError ? (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 space-y-2 my-2">
                <p className="font-semibold">{deleteError}</p>
                <p className="text-[11px] text-rose-700">
                  Deactivating this skill hides it from future assessment pickers while preserving employee review histories.
                </p>
                <Button
                  size="sm"
                  onClick={() => deactivateMutation.mutate(deleteSkill.id)}
                  className="bg-slate-900 hover:bg-black text-white text-xs w-full mt-2"
                >
                  <PowerOff className="w-3.5 h-3.5 mr-1" />
                  Deactivate Skill Instead
                </Button>
              </div>
            ) : (
              <p className="text-xs text-slate-600 my-2">
                Are you sure you want to delete <strong>{deleteSkill.name}</strong>?
              </p>
            )}

            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => setDeleteSkill(null)}>
                {deleteError ? "Close" : "Cancel"}
              </Button>
              {!deleteError && (
                <Button
                  variant="destructive"
                  disabled={deleteMutation.isPending}
                  onClick={() => deleteMutation.mutate(deleteSkill.id)}
                >
                  {deleteMutation.isPending ? "Deleting..." : "Delete Skill"}
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
