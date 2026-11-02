"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  TrendingUp,
  Award,
  BookOpen,
  Users,
  Grid,
  Download,
  Filter,
  Layers,
  Sparkles,
} from "lucide-react";
import { api } from "@/lib/api/client";
import type { Department, ReviewCycle } from "@/lib/api/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";

export default function HrAnalyticsPage() {
  const [selectedDept, setSelectedDept] = useState("");
  const [selectedCycle, setSelectedCycle] = useState("");

  const filters = {
    department: selectedDept || undefined,
    cycle: selectedCycle || undefined,
  };

  // Queries
  const { data: departments } = useQuery({
    queryKey: ["departments"],
    queryFn: () => api.departments.list(),
  });

  const { data: cycles } = useQuery({
    queryKey: ["review-cycles"],
    queryFn: () => api.reviewCycles.list(),
  });

  // Tab 1: Performance
  const { data: ratingDist, isLoading: distLoading } = useQuery({
    queryKey: ["analytics-distribution", filters],
    queryFn: () => api.analytics.getRatingDistribution(filters),
  });

  const { data: perfTrend, isLoading: trendLoading } = useQuery({
    queryKey: ["analytics-trend", filters],
    queryFn: () => api.analytics.getTrend(filters),
  });

  // Tab 2: Skills
  const { data: heatmapData, isLoading: heatmapLoading } = useQuery({
    queryKey: ["analytics-heatmap", filters],
    queryFn: () => api.analytics.getSkillsHeatmap(filters),
  });

  const { data: shortagesData, isLoading: shortagesLoading } = useQuery({
    queryKey: ["analytics-shortages", filters],
    queryFn: () => api.analytics.getSkillsShortages(filters),
  });

  // Tab 3: Training
  const { data: trainingCompletion, isLoading: trainingLoading } = useQuery({
    queryKey: ["analytics-training-completion", filters],
    queryFn: () => api.analytics.getTrainingCompletion(filters),
  });

  // Tab 4: Readiness
  const { data: readinessByRole, isLoading: readinessLoading } = useQuery({
    queryKey: ["analytics-readiness-role", filters],
    queryFn: () => api.analytics.getReadinessByRole(filters),
  });

  const { data: mobilityPipeline, isLoading: mobilityLoading } = useQuery({
    queryKey: ["analytics-mobility-pipeline", filters],
    queryFn: () => api.analytics.getMobilityPipeline(filters),
  });

  // Tab 5: Nine-Box
  const { data: nineBoxData, isLoading: nineBoxLoading } = useQuery({
    queryKey: ["analytics-nine-box", filters],
    queryFn: () => api.analytics.getNineBox(filters),
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">HR Analytics & Insights</h1>
          <p className="text-sm text-slate-500 mt-1">
            Organizational rating distributions, skill shortage heatmaps, mobility pipelines, and 9-box matrix.
          </p>
        </div>
        <Button variant="outline" size="sm" className="bg-white text-xs">
          <Download className="w-3.5 h-3.5 mr-1.5" />
          Export Analytics Data
        </Button>
      </div>

      {/* Global Filter Bar */}
      <Card>
        <CardContent className="p-4 flex flex-col sm:flex-row items-center gap-3">
          <div className="w-full sm:w-64">
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="w-full h-9 px-3 rounded-md border border-slate-300 bg-white text-xs text-slate-800"
            >
              <option value="">All Departments</option>
              {departments?.map((d: Department) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          <div className="w-full sm:w-64">
            <select
              value={selectedCycle}
              onChange={(e) => setSelectedCycle(e.target.value)}
              className="w-full h-9 px-3 rounded-md border border-slate-300 bg-white text-xs text-slate-800"
            >
              <option value="">All Review Cycles</option>
              {cycles?.map((c: ReviewCycle) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {(selectedDept || selectedCycle) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedDept("");
                setSelectedCycle("");
              }}
              className="text-xs text-slate-500"
            >
              Reset Filters
            </Button>
          )}
        </CardContent>
      </Card>

      {/* 5 Analytics Tabs */}
      <Tabs defaultValue="performance" className="w-full">
        <TabsList className="bg-slate-100 p-1 rounded-lg w-full justify-start overflow-x-auto">
          <TabsTrigger value="performance">1. Performance</TabsTrigger>
          <TabsTrigger value="skills">2. Skills Heatmap</TabsTrigger>
          <TabsTrigger value="training">3. Training & Learning</TabsTrigger>
          <TabsTrigger value="readiness">4. Succession & Readiness</TabsTrigger>
          <TabsTrigger value="nine-box">5. Nine-Box Matrix</TabsTrigger>
        </TabsList>

        {/* TAB 1: Performance */}
        <TabsContent value="performance" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Rating Distribution */}
            <Card>
              <CardHeader className="p-6 pb-4 border-b border-slate-100">
                <CardTitle className="text-base font-semibold text-slate-900">
                  Rating Distribution
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Spread of employee ratings across 1 (Needs Improvement) to 5 (Outstanding)
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                {distLoading ? (
                  <LoadingState rows={4} />
                ) : (
                  <div className="space-y-4">
                    {ratingDist?.distribution.map((d: any) => (
                      <div key={d.rating} className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="font-semibold text-slate-800">
                            Rating {d.rating} {d.rating === 5 ? "(Outstanding)" : d.rating === 1 ? "(Needs Improvement)" : ""}
                          </span>
                          <span className="text-slate-500">
                            {d.count} reviews ({d.percentage}%)
                          </span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className="h-full bg-indigo-600 rounded-full"
                            style={{ width: `${d.percentage}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Performance Trend */}
            <Card>
              <CardHeader className="p-6 pb-4 border-b border-slate-100">
                <CardTitle className="text-base font-semibold text-slate-900">
                  Performance Multi-Cycle Trend
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Average calibrated rating evolution over time
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                {trendLoading ? (
                  <LoadingState rows={4} />
                ) : (
                  <div className="space-y-3">
                    {perfTrend?.map((t: any) => (
                      <div
                        key={t.cycle_id}
                        className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-slate-50/50 text-xs"
                      >
                        <div>
                          <p className="font-semibold text-slate-900">{t.cycle_name}</p>
                          <p className="text-[11px] text-slate-500">{t.total_reviews} total reviews</p>
                        </div>
                        <div className="text-right">
                          <span className="text-lg font-bold text-indigo-600">{t.avg_rating}</span>
                          <span className="text-[10px] text-slate-400 block">Avg Rating / 5.0</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TAB 2: Skills Heatmap */}
        <TabsContent value="skills" className="space-y-6">
          <Card>
            <CardHeader className="p-6 pb-4 border-b border-slate-100">
              <CardTitle className="text-base font-semibold text-slate-900">
                Department Skill Coverage Heatmap
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Validated competency proficiency levels (1.0 to 5.0) mapped across departments
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              {heatmapLoading ? (
                <LoadingState rows={5} />
              ) : heatmapData ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border border-slate-200 rounded-lg">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="p-3 text-left font-semibold text-slate-700">Department</th>
                        {heatmapData.skills.map((s: string) => (
                          <th key={s} className="p-3 text-center font-medium text-slate-600 truncate max-w-[120px]">
                            {s}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {heatmapData.departments.map((dept: string, rIdx: number) => (
                        <tr key={dept} className="border-b border-slate-100 hover:bg-slate-50/50">
                          <td className="p-3 font-semibold text-slate-900">{dept}</td>
                          {heatmapData.cells[rIdx]?.map((val: number, cIdx: number) => {
                            const bg =
                              val >= 4.0
                                ? "bg-emerald-100 text-emerald-900 font-bold"
                                : val >= 3.0
                                ? "bg-indigo-50 text-indigo-900 font-semibold"
                                : val >= 2.0
                                ? "bg-amber-50 text-amber-900"
                                : "bg-red-50 text-red-900";
                            return (
                              <td key={cIdx} className={`p-3 text-center ${bg}`}>
                                {val}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </CardContent>
          </Card>

          {/* Shortages List */}
          <Card>
            <CardHeader className="p-6 pb-4 border-b border-slate-100">
              <CardTitle className="text-base font-semibold text-slate-900">
                Skill Shortages & Hiring Urgency
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Discrepancy between organization role demands and validated employee capabilities
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              {shortagesLoading ? (
                <LoadingState rows={4} />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {shortagesData?.map((item: any) => (
                    <div
                      key={item.skill_id}
                      className="p-3.5 rounded-lg border border-slate-200 bg-white flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-bold text-slate-900 block">{item.skill_name}</span>
                        <span className="text-[11px] text-slate-500">
                          Supply: {item.current_supply} validated · Demand: {item.required_demand}
                        </span>
                      </div>
                      <Badge
                        variant={item.urgency === "HIGH" ? "destructive" : item.urgency === "MEDIUM" ? "warning" : "secondary"}
                        className="text-[10px]"
                      >
                        {item.urgency} Urgency (Gap: -{item.shortage_gap})
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: Training & Learning */}
        <TabsContent value="training" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="p-4 pb-2">
                <CardDescription className="text-xs font-medium text-slate-500">
                  Total Course Enrollments
                </CardDescription>
                <CardTitle className="text-2xl font-bold text-slate-900 mt-1">
                  {trainingCompletion?.total_enrollments ?? 0}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <span className="text-[11px] text-indigo-600 font-medium">Across active catalog</span>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="p-4 pb-2">
                <CardDescription className="text-xs font-medium text-slate-500">
                  Completion Rate
                </CardDescription>
                <CardTitle className="text-2xl font-bold text-emerald-600 mt-1">
                  {trainingCompletion?.overall_completion_pct ?? 0}%
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <span className="text-[11px] text-emerald-600 font-medium">Completed courses</span>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="p-4 pb-2">
                <CardDescription className="text-xs font-medium text-slate-500">
                  In-Progress Training
                </CardDescription>
                <CardTitle className="text-2xl font-bold text-amber-600 mt-1">
                  {trainingCompletion?.in_progress ?? 0}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <span className="text-[11px] text-amber-600 font-medium">Active learners</span>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TAB 4: Readiness & Succession */}
        <TabsContent value="readiness" className="space-y-6">
          <Card>
            <CardHeader className="p-6 pb-4 border-b border-slate-100">
              <CardTitle className="text-base font-semibold text-slate-900">
                Talent Pool Readiness by Target Role
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Internal candidate pipelines approaching promotion readiness thresholds
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              {readinessLoading ? (
                <LoadingState rows={4} />
              ) : (
                <div className="space-y-4">
                  {readinessByRole?.map((r: any) => (
                    <div key={r.role_id} className="p-3.5 rounded-lg border border-slate-200 bg-white space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <div>
                          <span className="font-bold text-slate-900">{r.role_title}</span>
                          <span className="text-slate-400 text-[11px] ml-2">Track: {r.track}</span>
                        </div>
                        <span className="text-slate-600 font-semibold">{r.total_candidates} candidates</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center text-xs pt-1">
                        <div className="p-2 rounded bg-blue-50 text-blue-900">
                          <span className="text-[10px] block text-blue-600 uppercase font-semibold">Developing</span>
                          <span className="font-bold text-sm">{r.developing}</span>
                        </div>
                        <div className="p-2 rounded bg-amber-50 text-amber-900">
                          <span className="text-[10px] block text-amber-600 uppercase font-semibold">Near Ready</span>
                          <span className="font-bold text-sm">{r.near_ready}</span>
                        </div>
                        <div className="p-2 rounded bg-emerald-50 text-emerald-900">
                          <span className="text-[10px] block text-emerald-600 uppercase font-semibold">Ready for Review</span>
                          <span className="font-bold text-sm">{r.ready_for_review}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 5: Nine-Box Matrix */}
        <TabsContent value="nine-box" className="space-y-6">
          <Card>
            <CardHeader className="p-6 pb-4 border-b border-slate-100">
              <CardTitle className="text-base font-semibold text-slate-900">
                Nine-Box Talent Matrix (Potential vs Performance)
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Grid assessment mapping employee performance against future growth potential.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              {nineBoxLoading ? (
                <LoadingState rows={6} />
              ) : nineBoxData ? (
                <div className="grid grid-cols-3 gap-3 max-w-2xl mx-auto">
                  {nineBoxData.grid.map((cell: any, i: number) => (
                    <div
                      key={i}
                      className="p-4 rounded-xl border border-slate-200 bg-white hover:border-indigo-400 transition-all flex flex-col justify-between h-28 text-center"
                    >
                      <div>
                        <span className="text-xs font-bold text-slate-900 block">{cell.label}</span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">{cell.category}</span>
                      </div>
                      <div className="mt-2">
                        <span className="text-2xl font-extrabold text-indigo-600">{cell.count}</span>
                        <span className="text-[10px] text-slate-500 block">people</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
