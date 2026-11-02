"use client";

import React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Users,
  Building2,
  CheckCircle2,
  AlertCircle,
  Target,
  Award,
  ArrowRight,
  UserPlus,
  RefreshCw,
  UploadCloud,
  TrendingUp,
  Shield,
  Layers,
} from "lucide-react";
import { api } from "@/lib/api/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { formatDateTime } from "@/lib/utils";

export default function HrDashboardPage() {
  const {
    data: dashboardData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["hr-dashboard"],
    queryFn: () => api.dashboard.getHrDashboard(),
  });

  if (isLoading) {
    return <LoadingState rows={8} />;
  }

  if (error || !dashboardData) {
    return (
      <ErrorState
        message={error instanceof Error ? error.message : "Failed to load dashboard metrics."}
        onRetry={() => refetch()}
      />
    );
  }

  const { kpis, cycle_progress_by_department, top_org_skill_gaps, readiness_distribution, recent_audit } =
    dashboardData;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">HR Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">
            Organization-level performance, review progress, and strategic talent readiness overview.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Link href="/hr/employees/new">
            <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white">
              <UserPlus className="w-4 h-4 mr-1.5" />
              Add Employee
            </Button>
          </Link>
          <Link href="/hr/review-cycles">
            <Button size="sm" variant="outline" className="bg-white">
              <RefreshCw className="w-4 h-4 mr-1.5 text-slate-500" />
              Launch Cycle
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

      {/* 6 KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <Card className="hover:border-slate-300 transition-colors">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-medium text-slate-500 flex items-center justify-between">
              Total Employees
              <Users className="w-4 h-4 text-indigo-500" />
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-slate-900 mt-1">
              {kpis?.total_employees ?? 0}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <span className="text-[11px] text-emerald-600 font-medium">Active headcount</span>
          </CardContent>
        </Card>

        <Card className="hover:border-slate-300 transition-colors">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-medium text-slate-500 flex items-center justify-between">
              Departments
              <Building2 className="w-4 h-4 text-blue-500" />
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-slate-900 mt-1">
              {kpis?.departments ?? 0}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <span className="text-[11px] text-slate-500 font-medium">Org hierarchy branches</span>
          </CardContent>
        </Card>

        <Card className="hover:border-slate-300 transition-colors">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-medium text-slate-500 flex items-center justify-between">
              Cycle Completion
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-slate-900 mt-1">
              {kpis?.active_cycle_completion_pct ?? 0}%
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <span className="text-[11px] text-emerald-600 font-medium">Current active cycle</span>
          </CardContent>
        </Card>

        <Card className="hover:border-slate-300 transition-colors">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-medium text-slate-500 flex items-center justify-between">
              Overdue Reviews
              <AlertCircle className="w-4 h-4 text-amber-500" />
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-slate-900 mt-1">
              {kpis?.overdue_reviews ?? 0}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <span className="text-[11px] text-amber-600 font-medium">Action needed</span>
          </CardContent>
        </Card>

        <Card className="hover:border-slate-300 transition-colors">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-medium text-slate-500 flex items-center justify-between">
              Avg Goal Score
              <Target className="w-4 h-4 text-purple-500" />
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-slate-900 mt-1">
              {kpis?.avg_goal_score ?? "0.00"}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <span className="text-[11px] text-slate-500 font-medium">Capped at 1.20</span>
          </CardContent>
        </Card>

        <Card className="hover:border-slate-300 transition-colors">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-medium text-slate-500 flex items-center justify-between">
              Open Validations
              <Award className="w-4 h-4 text-rose-500" />
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-slate-900 mt-1">
              {kpis?.open_skill_validations ?? 0}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <span className="text-[11px] text-slate-500 font-medium">Manager review queue</span>
          </CardContent>
        </Card>
      </div>

      {/* Main Grid: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Review Cycle Progress by Department */}
        <Card>
          <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold text-slate-900">
                Review Cycle Progress by Department
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 mt-0.5">
                Current completion rates across included branches
              </CardDescription>
            </div>
            <Link href="/hr/review-cycles" className="text-xs font-medium text-indigo-600 hover:underline flex items-center">
              View Cycles <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Link>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            {cycle_progress_by_department?.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No active review cycles.</p>
            ) : (
              cycle_progress_by_department?.map((dept: any) => (
                <div key={dept.department} className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-slate-800">{dept.department}</span>
                    <span className="text-slate-500">
                      {dept.completed} / {dept.total} ({dept.completion_pct}%)
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, dept.completion_pct)}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Top Organization Skill Gaps */}
        <Card>
          <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold text-slate-900">
                Top Organization Skill Gaps
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 mt-0.5">
                Ranked competencies needing training intervention
              </CardDescription>
            </div>
            <Link href="/hr/skills" className="text-xs font-medium text-indigo-600 hover:underline flex items-center">
              Skills Library <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Link>
          </CardHeader>
          <CardContent className="p-6 space-y-3">
            {top_org_skill_gaps?.map((gap: any, i: number) => (
              <div
                key={gap.skill}
                className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center">
                    {i + 1}
                  </span>
                  <div>
                    <p className="text-xs font-semibold text-slate-900">{gap.skill}</p>
                    <p className="text-[11px] text-slate-500">{gap.affected_count} employees impacted</p>
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant="warning" className="text-[10px] font-medium">
                    Avg Gap: -{gap.avg_gap}
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Career Readiness Distribution */}
        <Card>
          <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold text-slate-900">
                Talent Readiness Distribution
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 mt-0.5">
                Succession pipeline readiness for next career roles
              </CardDescription>
            </div>
            <Link href="/hr/analytics" className="text-xs font-medium text-indigo-600 hover:underline flex items-center">
              View Analytics <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Link>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-4 rounded-lg bg-blue-50/70 border border-blue-100">
                <span className="text-[11px] font-semibold text-blue-700 block uppercase tracking-wider">
                  Developing
                </span>
                <span className="text-2xl font-bold text-blue-900 mt-1 block">
                  {readiness_distribution?.DEVELOPING ?? 0}
                </span>
                <span className="text-[10px] text-blue-600 block mt-0.5">Closing gaps</span>
              </div>
              <div className="p-4 rounded-lg bg-amber-50/70 border border-amber-100">
                <span className="text-[11px] font-semibold text-amber-700 block uppercase tracking-wider">
                  Near Ready
                </span>
                <span className="text-2xl font-bold text-amber-900 mt-1 block">
                  {readiness_distribution?.NEAR_READY ?? 0}
                </span>
                <span className="text-[10px] text-amber-600 block mt-0.5">&gt;75% coverage</span>
              </div>
              <div className="p-4 rounded-lg bg-emerald-50/70 border border-emerald-100">
                <span className="text-[11px] font-semibold text-emerald-700 block uppercase tracking-wider">
                  Ready for Review
                </span>
                <span className="text-2xl font-bold text-emerald-900 mt-1 block">
                  {readiness_distribution?.READY_FOR_REVIEW ?? 0}
                </span>
                <span className="text-[10px] text-emerald-600 block mt-0.5">Promotion eligible</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Audit Highlights */}
        <Card>
          <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold text-slate-900">
                Recent Audit Highlights
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 mt-0.5">
                Key events and policy actions across the organization
              </CardDescription>
            </div>
            <Link href="/hr/audit-logs" className="text-xs font-medium text-indigo-600 hover:underline flex items-center">
              All Logs <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Link>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-3">
              {recent_audit?.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">No audit events recorded.</p>
              ) : (
                recent_audit?.map((item: any) => (
                  <div key={item.id} className="flex items-start space-x-3 text-xs pb-3 border-b border-slate-100 last:border-0 last:pb-0">
                    <div className="p-1.5 rounded-full bg-slate-100 text-slate-600 mt-0.5">
                      <Shield className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 truncate">
                        {item.action.replace(/_/g, " ")} — <span className="text-slate-500">{item.entity}</span>
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        By <span className="font-medium text-slate-700">{item.actor}</span> · {formatDateTime(item.created_at)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
