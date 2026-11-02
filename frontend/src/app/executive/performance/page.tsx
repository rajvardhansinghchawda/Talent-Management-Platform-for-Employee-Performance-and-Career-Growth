"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  TrendingUp,
  BarChart3,
  Shield,
  Filter,
  CheckCircle2,
  Target,
  ArrowUpRight,
  Info,
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
import { api, fetchApi } from "@/lib/api/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";

export default function OrganizationPerformancePage() {
  const [selectedCycle, setSelectedCycle] = useState("");

  const { data: cycles } = useQuery({
    queryKey: ["review-cycles"],
    queryFn: () => api.reviewCycles.list(),
  });

  const { data: distributionData, isLoading: distLoading } = useQuery({
    queryKey: ["exec-rating-distribution", selectedCycle],
    queryFn: () =>
      fetchApi<{
        distribution: Array<{ rating: number; label: string; count: number; percentage: number }>;
        total: number;
        suppression?: { applied: boolean; masked_cells: number };
      }>(`/analytics/executive/rating-distribution/?${selectedCycle ? `cycle=${selectedCycle}` : ""}`),
  });

  const { data: trendData, isLoading: trendLoading } = useQuery({
    queryKey: ["exec-rating-trend"],
    queryFn: () => fetchApi<Array<{ cycle_name: string; avg_rating: number; total_reviews: number }>>("/analytics/executive/rating-trend/"),
  });

  const { data: deptComparison, isLoading: deptLoading } = useQuery({
    queryKey: ["exec-dept-comparison", selectedCycle],
    queryFn: () =>
      fetchApi<
        Array<{
          department: string;
          avg_goal_score: number;
          avg_rating: number;
          headcount: number;
          is_merged?: boolean;
        }>
      >(`/analytics/executive/department-comparison/?${selectedCycle ? `cycle=${selectedCycle}` : ""}`),
  });

  const { data: goalAchievement, isLoading: goalLoading } = useQuery({
    queryKey: ["exec-goal-achievement", selectedCycle],
    queryFn: () =>
      fetchApi<
        Array<{
          department: string;
          achievement_rate: number;
          exceeded_rate: number;
        }>
      >(`/analytics/executive/goal-achievement/?${selectedCycle ? `cycle=${selectedCycle}` : ""}`),
  });

  const isLoading = distLoading || trendLoading || deptLoading || goalLoading;

  if (isLoading) return <LoadingState rows={8} />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Organization Performance</h1>
          <p className="text-sm text-slate-500 mt-1">
            Aggregated appraisal ratings, performance distribution curves, and department achievement rates.
          </p>
        </div>

        {/* Review Cycle Filter */}
        <div className="w-full sm:w-64">
          <select
            value={selectedCycle}
            onChange={(e) => setSelectedCycle(e.target.value)}
            className="w-full h-9 px-3 rounded-md border border-slate-300 bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600"
          >
            <option value="">All Review Cycles (Aggregated)</option>
            {cycles?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Small Group Suppression Disclaimer */}
      <div className="p-3.5 rounded-lg bg-slate-100 border border-slate-200 text-xs text-slate-700 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Shield className="w-4 h-4 text-indigo-600 shrink-0" />
          <span>
            <strong>Small-Group Privacy Masking:</strong> Groups and cohorts with fewer than 5 employees are aggregated into <em>Other (small groups)</em> to ensure individual employee confidentiality.
          </span>
        </div>
        <Badge variant="secondary" className="text-[10px] uppercase font-bold">
          Aggregates Only
        </Badge>
      </div>

      {/* 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Rating Distribution Histogram */}
        <Card>
          <CardHeader className="p-6 pb-2 border-b border-slate-100">
            <CardTitle className="text-base font-semibold text-slate-900">
              Rating Distribution Curve
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Total Evaluated Records: {distributionData?.total || 50}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={distributionData?.distribution || []}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="label" stroke="#94A3B8" fontSize={10} tickLine={false} />
                  <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #E2E8F0", fontSize: "12px" }} />
                  <Bar dataKey="count" name="Employee Count" fill="#4F46E5" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Rating Trend Across Cycles */}
        <Card>
          <CardHeader className="p-6 pb-2 border-b border-slate-100">
            <CardTitle className="text-base font-semibold text-slate-900">Rating Trend Across Cycles</CardTitle>
            <CardDescription className="text-xs text-slate-500">Historical average appraisal score trajectory</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData || []}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="cycle_name" stroke="#94A3B8" fontSize={11} tickLine={false} />
                  <YAxis domain={[1, 5]} stroke="#94A3B8" fontSize={11} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #E2E8F0", fontSize: "12px" }} />
                  <Line type="monotone" dataKey="avg_rating" name="Average Rating (/5)" stroke="#10B981" strokeWidth={2.5} dot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Department Comparison Chart */}
        <Card>
          <CardHeader className="p-6 pb-2 border-b border-slate-100">
            <CardTitle className="text-base font-semibold text-slate-900">Department Performance Comparison</CardTitle>
            <CardDescription className="text-xs text-slate-500">Average rating and goal achievement score</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={deptComparison || []}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="department" stroke="#94A3B8" fontSize={11} tickLine={false} />
                  <YAxis domain={[0, 5]} stroke="#94A3B8" fontSize={11} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #E2E8F0", fontSize: "12px" }} />
                  <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }} />
                  <Bar dataKey="avg_rating" name="Avg Rating" fill="#4F46E5" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="avg_goal_score" name="Avg Goal Score" fill="#93C5FD" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Goal Achievement Rates */}
        <Card>
          <CardHeader className="p-6 pb-2 border-b border-slate-100">
            <CardTitle className="text-base font-semibold text-slate-900">Goal Achievement & Exceeded Rates</CardTitle>
            <CardDescription className="text-xs text-slate-500">Percentage of department deliverables met or exceeded</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={goalAchievement || []}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="department" stroke="#94A3B8" fontSize={11} tickLine={false} />
                  <YAxis domain={[0, 100]} stroke="#94A3B8" fontSize={11} tickLine={false} unit="%" />
                  <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #E2E8F0", fontSize: "12px" }} />
                  <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }} />
                  <Bar dataKey="achievement_rate" name="% Goals Met/Exceeded" fill="#10B981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="exceeded_rate" name="% Exceeded Target" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
