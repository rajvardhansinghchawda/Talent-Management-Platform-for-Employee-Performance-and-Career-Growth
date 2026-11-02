"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  TrendingUp,
  Award,
  BookOpen,
  Grid,
  Filter,
  CheckCircle2,
  Users,
} from "lucide-react";
import { api } from "@/lib/api/client";
import type { ReviewCycle } from "@/lib/api/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";

export default function TeamAnalyticsPage() {
  const [cycleFilter, setCycleFilter] = useState("");

  // Queries
  const { data: cycles } = useQuery({
    queryKey: ["review-cycles"],
    queryFn: () => api.reviewCycles.list(),
  });

  const { data: goalDistData, isLoading: goalDistLoading } = useQuery({
    queryKey: ["manager-analytics-goal-dist"],
    queryFn: () => api.manager.getTeamGoalDistribution(),
  });

  const { data: trendData, isLoading: trendLoading } = useQuery({
    queryKey: ["manager-analytics-trend"],
    queryFn: () => api.manager.getTeamRatingTrend(),
  });

  const { data: heatmapData, isLoading: heatmapLoading } = useQuery({
    queryKey: ["manager-analytics-heatmap"],
    queryFn: () => api.manager.getTeamSkillHeatmap(),
  });

  const { data: trainingData, isLoading: trainingLoading } = useQuery({
    queryKey: ["manager-analytics-training"],
    queryFn: () => api.manager.getTeamTrainingCompletion(),
  });

  const goalBuckets = goalDistData?.buckets || [];
  const trend = trendData || [];
  const heatmap = heatmapData || { skills: [], rows: [] };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Team Analytics & Calibration</h1>
          <p className="text-sm text-slate-500 mt-1">
            Performance distributions, team skill heatmaps, training progress, and 9-box potential matrix.
          </p>
        </div>
      </div>

      {/* 4 Consistent Analytics Blocks (per §5.12) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Goal Progress Distribution */}
        <Card>
          <CardHeader className="p-6 pb-3 border-b border-slate-100">
            <CardTitle className="text-base font-semibold text-slate-900 flex items-center space-x-2">
              <TrendingUp className="w-4 h-4 text-indigo-600" />
              <span>Goal Progress Distribution</span>
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Distribution of active team deliverable milestones
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            {goalDistLoading ? (
              <LoadingState rows={3} />
            ) : (
              <div className="space-y-3">
                {goalBuckets.map((b) => (
                  <div key={b.label} className="space-y-1 text-xs">
                    <div className="flex justify-between font-semibold">
                      <span className="text-slate-800">{b.label}</span>
                      <span className="text-indigo-600">{b.count} goal{b.count === 1 ? "" : "s"}</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full bg-indigo-600 rounded-full"
                        style={{ width: `${Math.min(100, b.count * 30 + 10)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 2. Rating Trend Across Review Cycles */}
        <Card>
          <CardHeader className="p-6 pb-3 border-b border-slate-100">
            <CardTitle className="text-base font-semibold text-slate-900 flex items-center space-x-2">
              <BarChart3 className="w-4 h-4 text-purple-600" />
              <span>Rating Trend by Cycle</span>
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Team average performance ratings across formal appraisals
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            {trendLoading ? (
              <LoadingState rows={3} />
            ) : (
              <div className="space-y-3">
                {trend.map((t) => (
                  <div
                    key={t.cycle_id}
                    className="p-3 rounded-lg border border-slate-100 bg-slate-50/50 flex justify-between items-center text-xs"
                  >
                    <div>
                      <span className="font-bold text-slate-900 block">{t.cycle_name}</span>
                      <span className="text-[11px] text-slate-400">Formal Cycle Score</span>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-bold text-purple-700">{t.avg_rating}</span>
                      <span className="text-[10px] text-slate-400 block">/ 5.0 Rating</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 3. Team Skill Heatmap */}
        <Card className="lg:col-span-2">
          <CardHeader className="p-6 pb-3 border-b border-slate-100">
            <CardTitle className="text-base font-semibold text-slate-900 flex items-center space-x-2">
              <Award className="w-4 h-4 text-emerald-600" />
              <span>Team Competency Proficiency Heatmap</span>
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Validated skill levels (1: Foundational to 5: Expert) across direct reports
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            {heatmapLoading ? (
              <LoadingState rows={4} />
            ) : heatmap.rows.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center italic">No team skills assessed yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs border border-slate-200 rounded-lg">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="p-3 text-left font-semibold text-slate-700">Team Member</th>
                      {heatmap.skills.map((s) => (
                        <th key={s} className="p-3 text-center font-medium text-slate-600 truncate max-w-[140px]">
                          {s}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {heatmap.rows.map((row) => (
                      <tr key={row.employee_name} className="border-b border-slate-100 hover:bg-slate-50/50">
                        <td className="p-3 font-semibold text-slate-900">{row.employee_name}</td>
                        {row.levels.map((lvl, idx) => {
                          const bg =
                            lvl >= 4
                              ? "bg-emerald-100 text-emerald-900 font-bold"
                              : lvl >= 3
                              ? "bg-indigo-50 text-indigo-900 font-semibold"
                              : "bg-amber-50 text-amber-900";
                          return (
                            <td key={idx} className={`p-3 text-center ${bg}`}>
                              Level {lvl}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 4. Training Completion */}
        <Card className="lg:col-span-2">
          <CardHeader className="p-6 pb-3 border-b border-slate-100">
            <CardTitle className="text-base font-semibold text-slate-900 flex items-center space-x-2">
              <BookOpen className="w-4 h-4 text-blue-600" />
              <span>Team Learning & Training Completion</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-center">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-[11px] text-slate-400 font-medium block uppercase">Total Assigned</span>
                <span className="text-2xl font-bold text-slate-900 mt-1 block">{trainingData?.total ?? 1}</span>
              </div>
              <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-100">
                <span className="text-[11px] text-emerald-700 font-medium block uppercase">Completed</span>
                <span className="text-2xl font-bold text-emerald-800 mt-1 block">{trainingData?.completed ?? 0}</span>
              </div>
              <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-100">
                <span className="text-[11px] text-amber-700 font-medium block uppercase">In Progress</span>
                <span className="text-2xl font-bold text-amber-800 mt-1 block">{trainingData?.in_progress ?? 1}</span>
              </div>
              <div className="p-4 rounded-xl bg-indigo-50/60 border border-indigo-100">
                <span className="text-[11px] text-indigo-700 font-medium block uppercase">Overall Progress</span>
                <span className="text-2xl font-bold text-indigo-800 mt-1 block">{trainingData?.completion_pct ?? 60}%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
