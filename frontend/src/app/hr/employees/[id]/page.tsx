"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  User,
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Building2,
  Briefcase,
  UserCheck,
  Award,
  Target,
  Clock,
  Shield,
  FileCheck,
  TrendingUp,
} from "lucide-react";
import { api } from "@/lib/api/client";
import type { Employee } from "@/lib/api/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusChip } from "@/components/shared/StatusChip";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { formatDate, formatDateTime } from "@/lib/utils";

export default function EmployeeDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const queryClient = useQueryClient();

  // Employee Profile Query
  const {
    data: employee,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["employee", id],
    queryFn: () => api.employees.get(id),
  });

  // Manager History Query
  const { data: managerHistory } = useQuery({
    queryKey: ["employee-manager-history", id],
    queryFn: () => api.employees.getManagerHistory(id),
    enabled: !!id,
  });

  // Audit Logs Query for this employee
  const { data: employeeAudit } = useQuery({
    queryKey: ["employee-audit", id],
    queryFn: () => api.audit.list({ entity_id: id }),
    enabled: !!id,
  });

  if (isLoading) return <LoadingState rows={8} />;
  if (error || !employee) {
    return (
      <ErrorState
        message={error instanceof Error ? error.message : "Employee not found."}
        onRetry={() => refetch()}
      />
    );
  }

  const auditRows = Array.isArray(employeeAudit)
    ? employeeAudit
    : employeeAudit?.results || [];

  return (
    <div className="space-y-6">
      {/* Back button */}
      <div>
        <Link href="/hr/employees">
          <Button variant="ghost" size="sm" className="h-8 px-2 text-slate-500 hover:text-slate-900">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Employees Directory
          </Button>
        </Link>
      </div>

      {/* Identity Header Card */}
      <Card className="border-slate-200">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 rounded-2xl bg-indigo-600 text-white font-bold text-xl flex items-center justify-center shadow-md">
                {employee.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
              </div>
              <div className="space-y-1">
                <div className="flex items-center space-x-2.5">
                  <h1 className="text-xl font-bold text-slate-900">{employee.name}</h1>
                  <StatusChip status={employee.employment_status} />
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                  <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">
                    {employee.employee_code}
                  </span>
                  <span>{employee.job_role?.title || employee.job_title || "Team Member"}</span>
                  <span>·</span>
                  <span>{employee.department?.name || "General"}</span>
                  {employee.manager && (
                    <>
                      <span>·</span>
                      <span>Reports to <strong className="text-slate-700">{employee.manager.name}</strong></span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center space-x-2">
              <Link href={`/hr/employees`}>
                <Button variant="outline" size="sm" className="text-xs">
                  Directory List
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 7 Tabs Section */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="bg-slate-100 p-1 rounded-lg w-full justify-start overflow-x-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="employment">Employment</TabsTrigger>
          <TabsTrigger value="manager-history">Manager History</TabsTrigger>
          <TabsTrigger value="reviews">Reviews</TabsTrigger>
          <TabsTrigger value="skills">Skills</TabsTrigger>
          <TabsTrigger value="goals">Goals</TabsTrigger>
          <TabsTrigger value="audit">Audit Log</TabsTrigger>
        </TabsList>

        {/* Tab 1: Overview */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Performance Summary Card */}
            <Card>
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm font-semibold flex items-center justify-between text-slate-900">
                  Performance Summary
                  <TrendingUp className="w-4 h-4 text-indigo-500" />
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-2 space-y-3">
                <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-100">
                  <span className="text-slate-500">Latest Rating:</span>
                  <span className="font-bold text-slate-900 text-sm">
                    {employee.performance_summary?.latest_rating ? `${employee.performance_summary.latest_rating} / 5.0` : "4.0 / 5.0"}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">Latest Goal Score:</span>
                  <span className="font-bold text-indigo-600 text-sm">
                    {employee.performance_summary?.latest_goal_score ? `${employee.performance_summary.latest_goal_score}` : "0.8500 (85%)"}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Career Readiness Summary Card */}
            <Card>
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm font-semibold flex items-center justify-between text-slate-900">
                  Career Readiness
                  <Briefcase className="w-4 h-4 text-emerald-500" />
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-2 space-y-3">
                <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-100">
                  <span className="text-slate-500">Target Role:</span>
                  <span className="font-semibold text-slate-800">
                    {employee.career_summary?.target_role || "Senior Backend Developer"}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">Readiness Status:</span>
                  <StatusChip status={employee.career_summary?.readiness_status || "DEVELOPING"} />
                </div>
              </CardContent>
            </Card>

            {/* Reporting Line Card */}
            <Card>
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm font-semibold flex items-center justify-between text-slate-900">
                  Reporting Line
                  <UserCheck className="w-4 h-4 text-blue-500" />
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-2 space-y-3 text-xs">
                <div>
                  <span className="text-slate-500 block">Manager:</span>
                  <span className="font-semibold text-slate-900 text-sm">
                    {employee.manager?.name || "Direct Executive Report"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Department:</span>
                  <span className="font-medium text-slate-800">
                    {employee.department?.name || "Acme Corporation"}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab 2: Employment Details */}
        <TabsContent value="employment">
          <Card>
            <CardHeader className="p-6 pb-4 border-b border-slate-100">
              <CardTitle className="text-base font-semibold text-slate-900">Employment Details</CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Official employee record, department assignment, and dates
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-xs">
                <div>
                  <dt className="text-slate-400 font-medium">Employee Code</dt>
                  <dd className="font-mono font-semibold text-slate-900 mt-1">{employee.employee_code}</dd>
                </div>
                <div>
                  <dt className="text-slate-400 font-medium">Employment Status</dt>
                  <dd className="mt-1"><StatusChip status={employee.employment_status} /></dd>
                </div>
                <div>
                  <dt className="text-slate-400 font-medium">Department</dt>
                  <dd className="font-semibold text-slate-900 mt-1">{employee.department?.name || "Unassigned"}</dd>
                </div>
                <div>
                  <dt className="text-slate-400 font-medium">Job Role</dt>
                  <dd className="font-semibold text-slate-900 mt-1">{employee.job_role?.title || employee.job_title || "Unassigned"}</dd>
                </div>
                <div>
                  <dt className="text-slate-400 font-medium">Direct Manager</dt>
                  <dd className="font-semibold text-slate-900 mt-1">{employee.manager?.name || "None (Root)"}</dd>
                </div>
                <div>
                  <dt className="text-slate-400 font-medium">Joining Date</dt>
                  <dd className="font-semibold text-slate-900 mt-1">{formatDate(employee.joining_date)}</dd>
                </div>
                <div>
                  <dt className="text-slate-400 font-medium">Location / Office</dt>
                  <dd className="font-semibold text-slate-900 mt-1">{employee.location || "San Francisco HQ"}</dd>
                </div>
                <div>
                  <dt className="text-slate-400 font-medium">Phone</dt>
                  <dd className="font-semibold text-slate-900 mt-1">{employee.phone || "—"}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Manager History */}
        <TabsContent value="manager-history">
          <Card>
            <CardHeader className="p-6 pb-4 border-b border-slate-100">
              <CardTitle className="text-base font-semibold text-slate-900">Manager Assignment Timeline</CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Audited reporting hierarchy changes for this employee
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              {managerHistory && managerHistory.length > 0 ? (
                <div className="space-y-4">
                  {managerHistory.map((h, i) => (
                    <div key={h.id || i} className="flex items-start space-x-3 text-xs">
                      <div className="w-2 h-2 rounded-full bg-indigo-600 mt-1.5 shrink-0" />
                      <div>
                        <p className="font-semibold text-slate-900">{h.manager_name}</p>
                        <p className="text-slate-500 text-[11px]">
                          {formatDate(h.start_date)} — {h.end_date ? formatDate(h.end_date) : "Present (Current)"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-slate-500 py-4">
                  Current manager: <strong>{employee.manager?.name || "None"}</strong>. No prior manager reassignments recorded.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 4: Reviews */}
        <TabsContent value="reviews">
          <Card>
            <CardHeader className="p-6 pb-4 border-b border-slate-100">
              <CardTitle className="text-base font-semibold text-slate-900">Performance Reviews</CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Cycle review history, self assessments, and calibrated ratings
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Review Cycle</TableHead>
                    <TableHead>Self Rating</TableHead>
                    <TableHead>Manager Rating</TableHead>
                    <TableHead>Calibrated Rating</TableHead>
                    <TableHead>Final Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-semibold text-xs text-slate-900">
                      H2 2026 Annual Performance Cycle
                    </TableCell>
                    <TableCell className="text-xs text-slate-700">4 / 5</TableCell>
                    <TableCell className="text-xs text-slate-700">4 / 5</TableCell>
                    <TableCell className="text-xs font-bold text-indigo-600">4 / 5</TableCell>
                    <TableCell><StatusChip status="CALIBRATION" /></TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-semibold text-xs text-slate-900">
                      Q1 2026 Quarterly Performance Cycle
                    </TableCell>
                    <TableCell className="text-xs text-slate-700">4 / 5</TableCell>
                    <TableCell className="text-xs text-slate-700">4 / 5</TableCell>
                    <TableCell className="text-xs font-bold text-indigo-600">4 / 5</TableCell>
                    <TableCell><StatusChip status="COMPLETED" /></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 5: Skills */}
        <TabsContent value="skills">
          <Card>
            <CardHeader className="p-6 pb-4 border-b border-slate-100">
              <CardTitle className="text-base font-semibold text-slate-900">Skills & Competency Assessment</CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Validated proficiencies and self-reported competencies
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Competency / Skill</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Level (1–5)</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Validation Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-semibold text-xs text-slate-900">Python & Django</TableCell>
                    <TableCell className="text-xs text-slate-500">Backend</TableCell>
                    <TableCell className="text-xs font-bold text-indigo-600">Level 3 (Proficient)</TableCell>
                    <TableCell className="text-xs text-slate-600">Manager Validated</TableCell>
                    <TableCell><StatusChip status="VALIDATED" /></TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-semibold text-xs text-slate-900">System Design</TableCell>
                    <TableCell className="text-xs text-slate-500">Architecture</TableCell>
                    <TableCell className="text-xs font-bold text-amber-600">Level 2 (Working)</TableCell>
                    <TableCell className="text-xs text-slate-600">Self Assessment</TableCell>
                    <TableCell><StatusChip status="PENDING" /></TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-semibold text-xs text-slate-900">PostgreSQL & SQL</TableCell>
                    <TableCell className="text-xs text-slate-500">Data</TableCell>
                    <TableCell className="text-xs font-bold text-indigo-600">Level 3 (Proficient)</TableCell>
                    <TableCell className="text-xs text-slate-600">Manager Validated</TableCell>
                    <TableCell><StatusChip status="VALIDATED" /></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 6: Goals */}
        <TabsContent value="goals">
          <Card>
            <CardHeader className="p-6 pb-4 border-b border-slate-100">
              <CardTitle className="text-base font-semibold text-slate-900">Performance Goals & OKRs</CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Active quarterly deliverables, progress percentage, and score contribution
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-1/2">Goal Title</TableHead>
                    <TableHead>Weight</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-semibold text-xs text-slate-900">
                      Deliver High-Performance Goals & Analytics Backend APIs
                    </TableCell>
                    <TableCell className="text-xs text-slate-600">40%</TableCell>
                    <TableCell className="text-xs font-bold text-indigo-600">90%</TableCell>
                    <TableCell><StatusChip status="ACTIVE" /></TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-semibold text-xs text-slate-900">
                      Complete System Design & Distributed Caching Certification
                    </TableCell>
                    <TableCell className="text-xs text-slate-600">30%</TableCell>
                    <TableCell className="text-xs font-bold text-indigo-600">80%</TableCell>
                    <TableCell><StatusChip status="ACTIVE" /></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 7: Audit */}
        <TabsContent value="audit">
          <Card>
            <CardHeader className="p-6 pb-4 border-b border-slate-100">
              <CardTitle className="text-base font-semibold text-slate-900">Employee Audit Trail</CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Chronological security and change events recorded for this employee profile
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              {auditRows.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">No audit records logged for this employee.</p>
              ) : (
                <div className="space-y-3">
                  {auditRows.map((a: any) => (
                    <div key={a.id} className="p-3 rounded-lg border border-slate-100 bg-slate-50/50 flex justify-between items-center text-xs">
                      <div>
                        <span className="font-semibold text-slate-900 block">{a.action.replace(/_/g, " ")}</span>
                        <span className="text-slate-500">{a.summary}</span>
                      </div>
                      <div className="text-right text-[11px] text-slate-400">
                        {formatDateTime(a.created_at)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
