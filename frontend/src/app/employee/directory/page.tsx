"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Users, Search, Building2, UserCheck, Mail } from "lucide-react";
import { api } from "@/lib/api/client";
import type { Employee } from "@/lib/api/types";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";

export default function EmployeeDirectoryPage() {
  const [search, setSearch] = useState("");

  const {
    data: employeesData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["employee-directory", search],
    queryFn: () => api.employees.list({ q: search || undefined, status: "ACTIVE" }),
  });

  if (isLoading) return <LoadingState rows={6} />;
  if (error) {
    return (
      <ErrorState
        message={error instanceof Error ? error.message : "Failed to load directory."}
        onRetry={() => refetch()}
      />
    );
  }

  const employees: Employee[] = Array.isArray(employeesData)
    ? employeesData
    : (employeesData as any)?.results || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">People Directory</h1>
        <p className="text-sm text-slate-500 mt-1">
          Explore organization colleagues, department assignments, and reporting leaders.
        </p>
      </div>

      {/* Search Input */}
      <Card>
        <CardContent className="p-4">
          <div className="relative w-full max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              placeholder="Search colleagues by name, role, or team..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>
        </CardContent>
      </Card>

      {/* Directory Table */}
      {employees.length === 0 ? (
        <EmptyState title="No colleagues found" description="Try searching with a different name or role." />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-80">Colleague</TableHead>
                  <TableHead>Role / Designation</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Reporting Manager</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.map((emp) => (
                  <TableRow key={emp.id} className="hover:bg-slate-50/75">
                    <TableCell className="font-medium">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs border border-indigo-200 shrink-0">
                          {emp.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                        </div>
                        <div>
                          <span className="font-semibold text-slate-900 text-xs block">{emp.name}</span>
                          <span className="text-[11px] text-slate-400 font-mono">{emp.employee_code}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-slate-700">
                      {emp.job_role?.title || emp.job_title || "Team Member"}
                    </TableCell>
                    <TableCell className="text-xs text-slate-700">
                      {emp.department?.name || <span className="text-slate-400">—</span>}
                    </TableCell>
                    <TableCell className="text-xs text-slate-700">
                      {emp.manager?.name ? (
                        <span className="font-medium text-slate-800">{emp.manager.name}</span>
                      ) : (
                        <span className="text-slate-400 italic">None</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}
    </div>
  );
}
