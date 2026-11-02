"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Briefcase,
  Plus,
  Search,
  Filter,
  Eye,
  Users,
  ShieldAlert,
  ArrowRight,
} from "lucide-react";
import { api } from "@/lib/api/client";
import type { Department, JobRole } from "@/lib/api/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
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

export default function JobRolesPage() {
  const queryClient = useQueryClient();

  const [q, setQ] = useState("");
  const [track, setTrack] = useState("");
  const [level, setLevel] = useState("");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [roleTrack, setRoleTrack] = useState("Engineering");
  const [roleLevel, setRoleLevel] = useState(3);
  const [description, setDescription] = useState("");
  const [minMonths, setMinMonths] = useState(24);
  const [isCritical, setIsCritical] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Queries
  const { data: rolesData, isLoading, error, refetch } = useQuery({
    queryKey: ["job-roles", { q, track, level }],
    queryFn: () =>
      api.jobRoles.list({
        q: q || undefined,
        track: track || undefined,
        level: level ? Number(level) : undefined,
      }),
  });

  const { data: departments } = useQuery({
    queryKey: ["departments"],
    queryFn: () => api.departments.list(),
  });

  // Create Mutation
  const createMutation = useMutation({
    mutationFn: (data: any) => api.jobRoles.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["job-roles"] });
      setDialogOpen(false);
      resetForm();
    },
    onError: (err: any) => {
      setFormError(err.message || "Failed to create job role.");
    },
  });

  const resetForm = () => {
    setTitle("");
    setDepartmentId("");
    setRoleTrack("Engineering");
    setRoleLevel(3);
    setDescription("");
    setMinMonths(24);
    setIsCritical(false);
    setFormError(null);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setFormError("Role title is required.");
      return;
    }
    createMutation.mutate({
      title,
      department: departmentId || null,
      track: roleTrack,
      level: roleLevel,
      description,
      min_months_in_role: minMonths,
      is_critical: isCritical,
    });
  };

  const roles: JobRole[] = Array.isArray(rolesData) ? rolesData : [];
  const tracks = Array.from(new Set(roles.map((r) => r.track).filter(Boolean)));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Job Roles & Levels</h1>
          <p className="text-sm text-slate-500 mt-1">
            Standard career ladder designations, competency requirements, and succession tracks.
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)} size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white">
          <Plus className="w-4 h-4 mr-1.5" />
          Add Job Role
        </Button>
      </div>

      {/* Filter Row */}
      <Card>
        <CardContent className="p-4 flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              placeholder="Search roles by title..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>

          <div className="w-full sm:w-48">
            <select
              value={track}
              onChange={(e) => setTrack(e.target.value)}
              className="w-full h-9 px-3 rounded-md border border-slate-300 bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600"
            >
              <option value="">All Tracks</option>
              {tracks.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div className="w-full sm:w-40">
            <select
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              className="w-full h-9 px-3 rounded-md border border-slate-300 bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600"
            >
              <option value="">All Levels</option>
              {[1, 2, 3, 4, 5].map((lvl) => (
                <option key={lvl} value={lvl}>
                  Level {lvl}
                </option>
              ))}
            </select>
          </div>

          {(q || track || level) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setQ("");
                setTrack("");
                setLevel("");
              }}
              className="text-xs text-slate-500 hover:text-slate-900"
            >
              Clear
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Roles Table */}
      {isLoading ? (
        <LoadingState rows={6} />
      ) : error ? (
        <ErrorState message="Failed to load job roles." onRetry={() => refetch()} />
      ) : roles.length === 0 ? (
        <EmptyState
          title="No job roles found"
          description="Create role ladder positions to define skill expectations and career paths."
          actionLabel="Add Job Role"
          onAction={() => setDialogOpen(true)}
        />
      ) : (
        <Card>
          {/* Desktop Table (lg:block, hidden on mobile/tablet) */}
          <div className="hidden lg:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-72">Role Title</TableHead>
                  <TableHead>Track</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Headcount</TableHead>
                  <TableHead>Critical Role</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roles.map((r) => (
                  <TableRow key={r.id} className="hover:bg-slate-50/75">
                    <TableCell className="font-semibold text-xs text-slate-900">
                      <Link href={`/hr/roles/${r.id}`} className="hover:text-indigo-600 transition-colors flex items-center space-x-2">
                        <Briefcase className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                        <span>{r.title}</span>
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs font-normal">
                        {r.track}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs font-mono font-bold text-indigo-600">
                      L{r.level}
                    </TableCell>
                    <TableCell className="text-xs text-slate-600">
                      {r.department_name || "Company-Wide"}
                    </TableCell>
                    <TableCell className="text-xs text-slate-600">
                      <span className="flex items-center">
                        <Users className="w-3.5 h-3.5 mr-1 text-slate-400" />
                        {r.employee_count} {r.employee_count === 1 ? "person" : "people"}
                      </span>
                    </TableCell>
                    <TableCell>
                      {r.is_critical ? (
                        <Badge variant="destructive" className="text-[10px] uppercase">
                          Critical Role
                        </Badge>
                      ) : (
                        <span className="text-xs text-slate-400">Standard</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/hr/roles/${r.id}`}>
                        <Button variant="ghost" size="sm" className="h-8 px-2 text-indigo-600 hover:bg-indigo-50 text-xs">
                          <Eye className="w-3.5 h-3.5 mr-1" />
                          View Ladder
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile & Tablet Stacked Cards (< lg) */}
          <div className="block lg:hidden divide-y divide-slate-100">
            {roles.map((r) => (
              <div key={r.id} className="p-4 space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <Link
                      href={`/hr/roles/${r.id}`}
                      className="font-bold text-slate-900 hover:text-indigo-600 text-sm block"
                    >
                      {r.title}
                    </Link>
                    <span className="text-xs text-slate-500">{r.department_name || "Company-Wide"}</span>
                  </div>
                  <Badge variant="outline" className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 border-indigo-200">
                    L{r.level}
                  </Badge>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-600 pt-1">
                  <span className="flex items-center">
                    <Users className="w-3.5 h-3.5 mr-1 text-slate-400" />
                    {r.employee_count} {r.employee_count === 1 ? "person" : "people"}
                  </span>
                  {r.is_critical && (
                    <Badge variant="destructive" className="text-[10px] uppercase">
                      Critical Role
                    </Badge>
                  )}
                </div>

                <div className="pt-2">
                  <Link href={`/hr/roles/${r.id}`}>
                    <Button variant="outline" size="sm" className="w-full h-8 text-xs">
                      <Eye className="w-3.5 h-3.5 mr-1 text-slate-500" />
                      View Role Ladder & Skills
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Add Role Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Job Role</DialogTitle>
            <DialogDescription>
              Define a position on your organization's career progression ladder.
            </DialogDescription>
          </DialogHeader>

          {formError && (
            <div className="p-2.5 rounded bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
              {formError}
            </div>
          )}

          <form onSubmit={handleCreate} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Role Title *</label>
              <Input
                placeholder="e.g. Senior Backend Developer"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Career Track *</label>
                <Input
                  placeholder="e.g. Engineering, Product, Design"
                  value={roleTrack}
                  onChange={(e) => setRoleTrack(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Level (1 to 5) *</label>
                <select
                  value={roleLevel}
                  onChange={(e) => setRoleLevel(Number(e.target.value))}
                  className="w-full h-9 px-3 rounded-md border border-slate-300 bg-white text-xs text-slate-800"
                >
                  <option value={1}>L1 (Entry / Junior)</option>
                  <option value={2}>L2 (Mid / Associate)</option>
                  <option value={3}>L3 (Senior)</option>
                  <option value={4}>L4 (Staff / Lead)</option>
                  <option value={5}>L5 (Principal / Director)</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Department</label>
              <select
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                className="w-full h-9 px-3 rounded-md border border-slate-300 bg-white text-xs text-slate-800"
              >
                <option value="">Company-Wide / Cross-Functional</option>
                {departments?.map((d: Department) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Min. Tenure in Role (Months)</label>
              <Input
                type="number"
                value={minMonths}
                onChange={(e) => setMinMonths(Number(e.target.value))}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Description</label>
              <textarea
                placeholder="Key scope of impact, core deliverables, and expectations..."
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full p-2.5 rounded-md border border-slate-300 text-xs text-slate-900"
              />
            </div>

            <label className="flex items-center space-x-2 text-xs text-slate-700 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={isCritical}
                onChange={(e) => setIsCritical(e.target.checked)}
                className="rounded text-indigo-600"
              />
              <span className="font-semibold text-slate-900">Mark as Critical Succession Position</span>
            </label>

            <DialogFooter className="pt-2">
              <Button variant="outline" type="button" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                {createMutation.isPending ? "Creating..." : "Save Role"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
