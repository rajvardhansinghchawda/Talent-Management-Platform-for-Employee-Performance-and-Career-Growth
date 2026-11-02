"use client";

import React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Users,
  Target,
  CheckCircle2,
  GraduationCap,
  Briefcase,
  TrendingUp,
  Award,
  AlertTriangle,
  ArrowRight,
  Shield,
  BarChart3,
  FileText,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { fetchApi } from "@/lib/api/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";

interface ExecutiveDashboardResponse {
  kpis: {
    headcount: number;
    avg_goal_score: number;
    review_completion_pct: number;
    training_completion_pct: number;
    near_or_ready_pct: number;
  };
  performance_by_department: Array<{
    department: string;
    avg_goal_score: number;
    avg_rating: number;
    headcount: number;
  }>;
  top_skill_shortages: Array<{
    skill: string;
    shortage_index: number;
  }>;
  readiness_pipeline: Record<string, number>;
  trend_by_cycle: Array<{
    cycle: string;
    avg_rating: number;
    avg_goal_score: number;
  }>;
  suppression?: {
    applied: boolean;
    suppressed_groups: number;
    merged_into?: string | null;
    min_group_size: number;
  };
}

export default function ExecutiveDashboardPage() {
  const {
    data: dashboard,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["executive-dashboard"],
    queryFn: () => fetchApi<ExecutiveDashboardResponse>("/dashboards/executive/"),
  });

  if (isLoading) return <LoadingState rows={8} />;
  if (error || !dashboard) {
    return (
      <ErrorState
        message={error instanceof Error ? error.message : "Failed to load executive metrics."}
        onRetry={() => refetch()}
      />
    );
  }

  const {
    kpis,
    performance_by_department,
    top_skill_shortages,
    readiness_pipeline,
    trend_by_cycle,
    suppression,
  } = dashboard;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Executive Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">
            Enterprise-wide talent analytics, performance benchmarks, and succession pipeline health.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Link href="/executive/reports">
            <Button size="sm" variant="outline" className="bg-white text-xs">
              <FileText className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
              Executive Summaries
            </Button>
          </Link>
          <Link href="/executive/readiness">
            <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs">
              <Briefcase className="w-3.5 h-3.5 mr-1.5" />
              Succession Depth
            </Button>
          </Link>
        </div>
      </div>

      {/* Small Group Privacy Banner if applied */}
      {suppression?.applied && (
        <div className="p-3 rounded-lg bg-slate-100 border border-slate-200 text-xs text-slate-600 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Shield className="w-4 h-4 text-indigo-600 shrink-0" />
            <span>
              <strong>Small-Group Privacy Protection Active:</strong> Groups with fewer than {suppression.min_group_size} employees are combined into {suppression.merged_into || "Other (small groups)"} to protect individual confidentiality.
            </span>
          </div>
          <Badge variant="secondary" className="text-[10px] uppercase font-bold">
            Aggregates Only
          </Badge>
        </div>
      )}

      {/* 5 KPI Cards Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-medium text-slate-500 flex items-center justify-between">
              Total Headcount
              <Users className="w-4 h-4 text-indigo-600" />
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-slate-900 mt-1">
              {kpis.headcount}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <span className="text-[11px] text-slate-500 font-medium">Active employees across org</span>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-medium text-slate-500 flex items-center justify-between">
              Avg Goal Score
              <Target className="w-4 h-4 text-purple-600" />
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-slate-900 mt-1">
              {kpis.avg_goal_score}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <span className="text-[11px] text-emerald-600 font-medium">Capped at 1.20</span>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-medium text-slate-500 flex items-center justify-between">
              Review Completion
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-slate-900 mt-1">
              {kpis.review_completion_pct}%
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <span className="text-[11px] text-slate-500 font-medium">Active appraisal cycle</span>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-medium text-slate-500 flex items-center justify-between">
              Training Completion
              <GraduationCap className="w-4 h-4 text-blue-600" />
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-slate-900 mt-1">
              {kpis.training_completion_pct}%
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <span className="text-[11px] text-slate-500 font-medium">Enrolled courses finished</span>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-medium text-slate-500 flex items-center justify-between">
              Near / Ready for Role
              <Briefcase className="w-4 h-4 text-amber-600" />
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-slate-900 mt-1">
              {kpis.near_or_ready_pct}%
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <span className="text-[11px] text-amber-600 font-medium">Promotion pipeline depth</span>
          </CardContent>
        </Card>
      </div>

      {/* Strategic 4 Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Performance by Department */}
        <Card>
          <CardHeader className="p-6 pb-2 border-b border-slate-100 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold text-slate-900">Performance by Department</CardTitle>
              <CardDescription className="text-xs text-slate-500">Average appraisal rating and goal score</CardDescription>
            </div>
            <Link href="/executive/performance" className="text-xs font-semibold text-indigo-600 hover:underline">
              Full Comparison <ArrowRight className="w-3.5 h-3.5 inline ml-1" />
            </Link>
          </CardHeader>
          <CardContent className="p-6">
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={performance_by_department}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="department" stroke="#94A3B8" fontSize={11} tickLine={false} />
                  <YAxis domain={[0, 5]} stroke="#94A3B8" fontSize={11} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #E2E8F0", fontSize: "12px" }} />
                  <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }} />
                  <Bar dataKey="avg_rating" name="Average Rating (/5)" fill="#4F46E5" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="avg_goal_score" name="Goal Score Index" fill="#93C5FD" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Chart 2: Top Skill Shortages */}
        <Card>
          <CardHeader className="p-6 pb-2 border-b border-slate-100 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold text-slate-900">Critical Skill Shortages</CardTitle>
              <CardDescription className="text-xs text-slate-500">Highest organizational capability gaps</CardDescription>
            </div>
            <Link href="/executive/skills" className="text-xs font-semibold text-indigo-600 hover:underline">
              Shortage Heatmap <ArrowRight className="w-3.5 h-3.5 inline ml-1" />
            </Link>
          </CardHeader>
          <CardContent className="p-6">
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={top_skill_shortages} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                  <XAxis type="number" domain={[0, 100]} stroke="#94A3B8" fontSize={11} tickLine={false} />
                  <YAxis dataKey="skill" type="category" width={140} stroke="#475569" fontSize={11} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #E2E8F0", fontSize: "12px" }} />
                  <Bar dataKey="shortage_index" name="Shortage Index (0–100)" fill="#F59E0B" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Chart 3: Readiness Pipeline Funnel */}
        <Card>
          <CardHeader className="p-6 pb-2 border-b border-slate-100 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold text-slate-900">Talent Readiness Pipeline</CardTitle>
              <CardDescription className="text-xs text-slate-500">Workforce distribution for target promotion roles</CardDescription>
            </div>
            <Link href="/executive/readiness" className="text-xs font-semibold text-indigo-600 hover:underline">
              Succession Depth <ArrowRight className="w-3.5 h-3.5 inline ml-1" />
            </Link>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-3 gap-4 text-center my-4">
              <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200">
                <span className="text-[10px] uppercase font-bold text-blue-700 block tracking-wider">Developing</span>
                <span className="text-3xl font-extrabold text-blue-950 mt-1 block">
                  {readiness_pipeline.DEVELOPING ?? 6}
                </span>
                <span className="text-[11px] text-blue-700 mt-0.5 block">&lt;70% Competency Match</span>
              </div>

              <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200">
                <span className="text-[10px] uppercase font-bold text-amber-700 block tracking-wider">Near Ready</span>
                <span className="text-3xl font-extrabold text-amber-950 mt-1 block">
                  {readiness_pipeline.NEAR_READY ?? 4}
                </span>
                <span className="text-[11px] text-amber-700 mt-0.5 block">70%–89% Match</span>
              </div>

              <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200">
                <span className="text-[10px] uppercase font-bold text-emerald-700 block tracking-wider">Ready for Review</span>
                <span className="text-3xl font-extrabold text-emerald-950 mt-1 block">
                  {readiness_pipeline.READY_FOR_REVIEW ?? 2}
                </span>
                <span className="text-[11px] text-emerald-700 mt-0.5 block">&ge;90% Match & Must-Haves Met</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Chart 4: Multi-Cycle Performance Trend */}
        <Card>
          <CardHeader className="p-6 pb-2 border-b border-slate-100 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold text-slate-900">Multi-Cycle Rating Trend</CardTitle>
              <CardDescription className="text-xs text-slate-500">Historical progression across appraisal cycles</CardDescription>
            </div>
            <Link href="/executive/performance" className="text-xs font-semibold text-indigo-600 hover:underline">
              Cycle History <ArrowRight className="w-3.5 h-3.5 inline ml-1" />
            </Link>
          </CardHeader>
          <CardContent className="p-6">
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trend_by_cycle}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="cycle" stroke="#94A3B8" fontSize={11} tickLine={false} />
                  <YAxis domain={[1, 5]} stroke="#94A3B8" fontSize={11} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #E2E8F0", fontSize: "12px" }} />
                  <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }} />
                  <Line type="monotone" dataKey="avg_rating" name="Average Calibrated Rating" stroke="#4F46E5" strokeWidth={2.5} dot={{ r: 5 }} />
                  <Line type="monotone" dataKey="avg_goal_score" name="Average Goal Score" stroke="#10B981" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
