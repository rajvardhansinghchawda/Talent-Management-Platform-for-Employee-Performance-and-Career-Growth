"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Users,
  UserPlus,
  UploadCloud,
  Search,
  Filter,
  MoreVertical,
  Eye,
  UserCheck,
  UserX,
  RefreshCw,
  Building2,
} from "lucide-react";
import { api } from "@/lib/api/client";
import type { Employee, Department, JobRole } from "@/lib/api/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusChip } from "@/components/shared/StatusChip";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function EmployeesListPage() {
  const queryClient = useQueryClient();

  // Filters state
  const [q, setQ] = useState("");
  const [department, setDepartment] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Action Dialog states
  const [deactivateEmp, setDeactivateEmp] = useState<Employee | null>(null);
  const [reactivateEmp, setReactivateEmp] = useState<Employee | null>(null);
  const [changeManagerEmp, setChangeManagerEmp] = useState<Employee | null>(null);
  const [newManagerId, setNewManagerId] = useState("");

  // Query employees
  const { data: employeesData, isLoading, error, refetch } = useQuery({
    queryKey: ["employees", { q, department, status: statusFilter }],
    queryFn: () =>
      api.employees.list({
        q: q || undefined,
        department: department || undefined,
        status: statusFilter || undefined,
      }),
  });

  // Query departments for filter dropdown
  const { data: departments } = useQuery({
    queryKey: ["departments"],
    queryFn: () => api.departments.list(),
  });

  // Query manager candidates for change manager modal
  const { data: managerCandidates } = useQuery({
    queryKey: ["manager-candidates"],
    queryFn: () => api.employees.list({ status: "ACTIVE" }),
  });

  // Mutations
  const deactivateMutation = useMutation({
    mutationFn: (id: string) => api.employees.deactivate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      setDeactivateEmp(null);
    },
  });

  const reactivateMutation = useMutation({
    mutationFn: (id: string) => api.employees.reactivate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      setReactivateEmp(null);
    },
  });

  const changeManagerMutation = useMutation({
    mutationFn: ({ id, manager }: { id: string; manager: string }) =>
      api.employees.changeManager(id, { manager }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      setChangeManagerEmp(null);
      setNewManagerId("");
    },
  });

  const employees: Employee[] = Array.isArray(employeesData)
    ? employeesData
    : employeesData?.results || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Employees Directory</h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage organization members, reporting assignments, departments, and employment status.
          </p>
        </div>
        <div className="flex items-center space-x-2.5">
          <Link href="/hr/employees/new">
            <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white">
              <UserPlus className="w-4 h-4 mr-1.5" />
              Add Employee
            </Button>
          </Link>
          <Link href="/hr/employees/import">
            <Button size="sm" variant="outline" className="bg-white">
              <UploadCloud className="w-4 h-4 mr-1.5 text-slate-500" />
              Import CSV
            </Button>
          </Link>
        </div>
      </div>

      {/* Filter Toolbar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row items-center gap-3">
            {/* Search */}
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                placeholder="Search by name, email, or employee code..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>

            {/* Department Filter */}
            <div className="w-full md:w-56">
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full h-9 px-3 rounded-md border border-slate-300 bg-white text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-600"
              >
                <option value="">All Departments</option>
                {departments?.map((d: Department) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div className="w-full md:w-44">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full h-9 px-3 rounded-md border border-slate-300 bg-white text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-600"
              >
                <option value="">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="ON_LEAVE">On Leave</option>
                <option value="EXITED">Exited</option>
              </select>
            </div>

            {(q || department || statusFilter) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setQ("");
                  setDepartment("");
                  setStatusFilter("");
                }}
                className="text-xs text-slate-500 hover:text-slate-900"
              >
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Content */}
      {isLoading ? (
        <LoadingState rows={6} />
      ) : error ? (
        <ErrorState
          message={error instanceof Error ? error.message : "Failed to load employees."}
          onRetry={() => refetch()}
        />
      ) : employees.length === 0 ? (
        <EmptyState
          title="No employees found"
          description={
            q || department || statusFilter
              ? "Try adjusting your filters or search keywords."
              : "Get started by adding your first organization member or importing via CSV."
          }
          actionLabel="Add Employee"
          onAction={() => {}}
        />
      ) : (
        <Card>
          {/* Desktop Table (lg:block, hidden on mobile/tablet) */}
          <div className="hidden lg:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-72">Employee</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Job Role</TableHead>
                  <TableHead>Manager</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.map((emp) => (
                  <TableRow key={emp.id} className="hover:bg-slate-50/75">
                    <TableCell className="font-medium">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-semibold flex items-center justify-center text-xs shrink-0 border border-indigo-200">
                          {emp.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                        </div>
                        <div>
                          <Link
                            href={`/hr/employees/${emp.id}`}
                            className="font-semibold text-slate-900 hover:text-indigo-600 transition-colors block text-xs"
                          >
                            {emp.name}
                          </Link>
                          <span className="text-[11px] text-slate-400 block">{emp.job_title || "Team Member"}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-slate-600 font-mono">{emp.employee_code}</TableCell>
                    <TableCell className="text-xs text-slate-700">
                      {emp.department?.name || <span className="text-slate-400">—</span>}
                    </TableCell>
                    <TableCell className="text-xs text-slate-700">
                      {emp.job_role?.title || emp.job_title || <span className="text-slate-400">—</span>}
                    </TableCell>
                    <TableCell className="text-xs text-slate-700">
                      {emp.manager?.name ? (
                        <span className="font-medium text-slate-800">{emp.manager.name}</span>
                      ) : (
                        <span className="text-slate-400 italic">None (Root)</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <StatusChip status={emp.employment_status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-1">
                        <Link href={`/hr/employees/${emp.id}`}>
                          <Button variant="ghost" size="sm" className="h-8 px-2 text-slate-600 hover:text-indigo-600" title="View Detail">
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setChangeManagerEmp(emp)}
                          className="h-8 px-2 text-slate-600 hover:text-indigo-600"
                          title="Change Manager"
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                        </Button>
                        {emp.employment_status === "ACTIVE" ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeactivateEmp(emp)}
                            className="h-8 px-2 text-rose-600 hover:bg-rose-50"
                            title="Deactivate Employee"
                          >
                            <UserX className="w-3.5 h-3.5" />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setReactivateEmp(emp)}
                            className="h-8 px-2 text-emerald-600 hover:bg-emerald-50"
                            title="Reactivate Employee"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
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
            {employees.map((emp) => (
              <div key={emp.id} className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs shrink-0 border border-indigo-200">
                      {emp.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                    </div>
                    <div>
                      <Link
                        href={`/hr/employees/${emp.id}`}
                        className="font-bold text-slate-900 hover:text-indigo-600 text-sm block"
                      >
                        {emp.name}
                      </Link>
                      <span className="text-xs text-slate-500 font-mono">{emp.employee_code}</span>
                    </div>
                  </div>
                  <StatusChip status={emp.employment_status} />
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50/70 p-2.5 rounded-lg border border-slate-100">
                  <div>
                    <span className="text-[10px] text-slate-400 font-medium block uppercase tracking-wider">Role</span>
                    <span className="font-medium text-slate-800">{emp.job_role?.title || emp.job_title || "—"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-medium block uppercase tracking-wider">Department</span>
                    <span className="font-medium text-slate-800">{emp.department?.name || "—"}</span>
                  </div>
                  <div className="col-span-2 pt-1 border-t border-slate-100 flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Reports to:</span>
                    <span className="font-medium text-slate-700">{emp.manager?.name || "None (Root)"}</span>
                  </div>
                </div>

                <div className="flex items-center justify-end space-x-2 pt-1">
                  <Link href={`/hr/employees/${emp.id}`} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full h-8 text-xs">
                      <Eye className="w-3.5 h-3.5 mr-1 text-slate-500" />
                      View Profile
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setChangeManagerEmp(emp)}
                    className="h-8 px-2.5 text-xs text-slate-700"
                    title="Change Manager"
                  >
                    <UserCheck className="w-3.5 h-3.5 mr-1 text-indigo-600" />
                    Manager
                  </Button>
                  {emp.employment_status === "ACTIVE" ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDeactivateEmp(emp)}
                      className="h-8 px-2.5 text-xs text-rose-600 border-rose-200 hover:bg-rose-50"
                      title="Deactivate"
                    >
                      <UserX className="w-3.5 h-3.5 text-rose-500" />
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setReactivateEmp(emp)}
                      className="h-8 px-2.5 text-xs text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                      title="Reactivate"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-emerald-500" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Deactivate Confirmation Dialog */}
      {deactivateEmp && (
        <ConfirmDialog
          open={!!deactivateEmp}
          onOpenChange={(open) => !open && setDeactivateEmp(null)}
          title={`Deactivate ${deactivateEmp.name}?`}
          description="Deactivating this employee freezes open review cycles, revokes user login access, and sets status to Exited. Historical performance records and audit trails remain preserved."
          confirmLabel="Deactivate"
          variant="destructive"
          loading={deactivateMutation.isPending}
          onConfirm={() => deactivateMutation.mutate(deactivateEmp.id)}
        />
      )}

      {/* Reactivate Confirmation Dialog */}
      {reactivateEmp && (
        <ConfirmDialog
          open={!!reactivateEmp}
          onOpenChange={(open) => !open && setReactivateEmp(null)}
          title={`Reactivate ${reactivateEmp.name}?`}
          description="Reactivating this employee restores login access and returns their status to Active."
          confirmLabel="Reactivate"
          variant="default"
          loading={reactivateMutation.isPending}
          onConfirm={() => reactivateMutation.mutate(reactivateEmp.id)}
        />
      )}

      {/* Change Manager Dialog */}
      {changeManagerEmp && (
        <Dialog open={!!changeManagerEmp} onOpenChange={(open) => !open && setChangeManagerEmp(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Change Manager for {changeManagerEmp.name}</DialogTitle>
              <DialogDescription>
                Assign a new manager. The system checks reporting hierarchy to prevent circular dependencies.
              </DialogDescription>
            </DialogHeader>

            <div className="py-4 space-y-3">
              <label className="text-xs font-semibold text-slate-700 block">Select New Manager</label>
              <select
                value={newManagerId}
                onChange={(e) => setNewManagerId(e.target.value)}
                className="w-full h-9 px-3 rounded-md border border-slate-300 bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600"
              >
                <option value="">Choose a manager...</option>
                {managerCandidates &&
                  (Array.isArray(managerCandidates) ? managerCandidates : managerCandidates.results || [])
                    .filter((m: Employee) => m.id !== changeManagerEmp.id)
                    .map((m: Employee) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.job_title || m.employee_code})
                      </option>
                    ))}
              </select>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setChangeManagerEmp(null)}>
                Cancel
              </Button>
              <Button
                disabled={!newManagerId || changeManagerMutation.isPending}
                onClick={() =>
                  changeManagerMutation.mutate({
                    id: changeManagerEmp.id,
                    manager: newManagerId,
                  })
                }
              >
                {changeManagerMutation.isPending ? "Assigning..." : "Save Manager"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
