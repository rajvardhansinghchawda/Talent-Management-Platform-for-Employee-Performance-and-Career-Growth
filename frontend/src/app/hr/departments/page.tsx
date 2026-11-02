"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  Plus,
  FolderTree,
  Edit2,
  Trash2,
  User,
  Users,
  ChevronRight,
  ChevronDown,
  AlertTriangle,
} from "lucide-react";
import { api } from "@/lib/api/client";
import type { Department, Employee } from "@/lib/api/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

export default function DepartmentsPage() {
  const queryClient = useQueryClient();

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [name, setName] = useState("");
  const [parentId, setParentId] = useState("");
  const [headId, setHeadId] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  // Delete modal state
  const [deleteDept, setDeleteDept] = useState<Department | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Expanded nodes state
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});

  const toggleExpand = (id: string) => {
    setExpandedNodes((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Queries
  const { data: treeData, isLoading, error, refetch } = useQuery({
    queryKey: ["departments-tree"],
    queryFn: () => api.departments.getTree(),
  });

  const { data: allDepartments } = useQuery({
    queryKey: ["departments-flat"],
    queryFn: () => api.departments.list(),
  });

  const { data: employeesData } = useQuery({
    queryKey: ["employees-active"],
    queryFn: () => api.employees.list({ status: "ACTIVE" }),
  });

  const employees: Employee[] = Array.isArray(employeesData)
    ? employeesData
    : employeesData?.results || [];

  // Mutations
  const saveMutation = useMutation({
    mutationFn: (data: { name: string; parent?: string | null; head?: string | null }) => {
      if (editingDept) {
        return api.departments.update(editingDept.id, data);
      }
      return api.departments.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments-tree"] });
      queryClient.invalidateQueries({ queryKey: ["departments-flat"] });
      queryClient.invalidateQueries({ queryKey: ["hr-dashboard"] });
      setDialogOpen(false);
      resetForm();
    },
    onError: (err: any) => {
      setFormError(err.message || "Failed to save department.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.departments.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments-tree"] });
      queryClient.invalidateQueries({ queryKey: ["departments-flat"] });
      queryClient.invalidateQueries({ queryKey: ["hr-dashboard"] });
      setDeleteDept(null);
      setDeleteError(null);
    },
    onError: (err: any) => {
      setDeleteError(
        err.message ||
          "Cannot delete department. Deletion is blocked while active employees or child departments are assigned."
      );
    },
  });

  const openCreateDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (dept: Department) => {
    setEditingDept(dept);
    setName(dept.name);
    setParentId(dept.parent || "");
    setHeadId(dept.head?.id || "");
    setFormError(null);
    setDialogOpen(true);
  };

  const resetForm = () => {
    setEditingDept(null);
    setName("");
    setParentId("");
    setHeadId("");
    setFormError(null);
  };

  // Recursive tree node renderer
  const renderTreeNode = (node: Department, depth = 0) => {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expandedNodes[node.id] !== false; // default open

    return (
      <div key={node.id} className="relative">
        <div
          className={`flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-white hover:border-indigo-300 hover:shadow-xs transition-all my-1.5 ${
            depth > 0 ? "ml-8" : ""
          }`}
        >
          <div className="flex items-center space-x-3">
            {hasChildren ? (
              <button
                onClick={() => toggleExpand(node.id)}
                className="p-1 rounded hover:bg-slate-100 text-slate-500"
              >
                {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
            ) : (
              <div className="w-6 h-6 flex items-center justify-center text-slate-300">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
              </div>
            )}

            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0">
              <Building2 className="w-4 h-4" />
            </div>

            <div>
              <span className="font-semibold text-xs text-slate-900 block">{node.name}</span>
              <div className="flex items-center space-x-3 text-[11px] text-slate-500 mt-0.5">
                <span className="flex items-center">
                  <Users className="w-3 h-3 mr-1 text-slate-400" />
                  {node.employee_count} {node.employee_count === 1 ? "Employee" : "Employees"}
                </span>
                {node.head && (
                  <span className="flex items-center">
                    <User className="w-3 h-3 mr-1 text-slate-400" />
                    Head: <strong className="ml-1 text-slate-700">{node.head.name}</strong>
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => openEditDialog(node)}
              className="h-8 px-2 text-slate-600 hover:text-indigo-600"
              title="Edit Department"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setDeleteError(null);
                setDeleteDept(node);
              }}
              className="h-8 px-2 text-rose-600 hover:bg-rose-50"
              title="Delete Department"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div className="border-l border-slate-200 ml-6 pl-2">
            {node.children!.map((child) => renderTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const departmentsTree: Department[] = Array.isArray(treeData) ? treeData : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Departments Hierarchy</h1>
          <p className="text-sm text-slate-500 mt-1">
            Organizational structure tree, department heads, and child branch relationships.
          </p>
        </div>
        <Button onClick={openCreateDialog} size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white">
          <Plus className="w-4 h-4 mr-1.5" />
          Add Department
        </Button>
      </div>

      {/* Main Hierarchy Container */}
      {isLoading ? (
        <LoadingState rows={6} />
      ) : error ? (
        <ErrorState
          message={error instanceof Error ? error.message : "Failed to load departments tree."}
          onRetry={() => refetch()}
        />
      ) : departmentsTree.length === 0 ? (
        <EmptyState
          title="No departments found"
          description="Create your first department to start building your organization hierarchy."
          actionLabel="Add Department"
          onAction={openCreateDialog}
        />
      ) : (
        <div className="space-y-1">
          {departmentsTree.map((dept) => renderTreeNode(dept))}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingDept ? `Edit ${editingDept.name}` : "Create New Department"}</DialogTitle>
            <DialogDescription>
              Departments define team boundaries and organizational reporting structures.
            </DialogDescription>
          </DialogHeader>

          {formError && (
            <div className="p-2.5 rounded bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
              {formError}
            </div>
          )}

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Department Name *</label>
              <Input
                placeholder="e.g. Platform Engineering"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Parent Department (Optional)</label>
              <select
                value={parentId}
                onChange={(e) => setParentId(e.target.value)}
                className="w-full h-9 px-3 rounded-md border border-slate-300 bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600"
              >
                <option value="">None (Top-Level Root Department)</option>
                {allDepartments
                  ?.filter((d: Department) => !editingDept || d.id !== editingDept.id)
                  .map((d: Department) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Department Head</label>
              <select
                value={headId}
                onChange={(e) => setHeadId(e.target.value)}
                className="w-full h-9 px-3 rounded-md border border-slate-300 bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600"
              >
                <option value="">None Assigned</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} ({emp.employee_code} - {emp.job_title || "Lead"})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
              disabled={!name.trim() || saveMutation.isPending}
              onClick={() =>
                saveMutation.mutate({
                  name,
                  parent: parentId || null,
                  head: headId || null,
                })
              }
            >
              {saveMutation.isPending ? "Saving..." : "Save Department"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Guard Dialog */}
      {deleteDept && (
        <Dialog open={!!deleteDept} onOpenChange={() => setDeleteDept(null)}>
          <DialogContent>
            <DialogHeader>
              <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mb-2">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <DialogTitle>Delete {deleteDept.name}?</DialogTitle>
              <DialogDescription>
                System invariants protect departments with assigned employees or sub-departments.
              </DialogDescription>
            </DialogHeader>

            {deleteError ? (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 space-y-1 my-2">
                <p className="font-semibold">Deletion Blocked</p>
                <p>{deleteError}</p>
                <p className="text-[11px] text-rose-600 pt-1">
                  Reassign the employees or sub-departments before attempting to delete this department.
                </p>
              </div>
            ) : (
              <p className="text-xs text-slate-600 my-2">
                Are you sure you want to delete <strong>{deleteDept.name}</strong>? This action cannot be undone.
              </p>
            )}

            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => setDeleteDept(null)}>
                {deleteError ? "Close" : "Cancel"}
              </Button>
              {!deleteError && (
                <Button
                  variant="destructive"
                  disabled={deleteMutation.isPending}
                  onClick={() => deleteMutation.mutate(deleteDept.id)}
                >
                  {deleteMutation.isPending ? "Deleting..." : "Delete Department"}
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
