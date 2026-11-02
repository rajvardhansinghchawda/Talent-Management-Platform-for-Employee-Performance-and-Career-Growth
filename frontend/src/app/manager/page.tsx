"use client";

import React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Users,
  Target,
  FileText,
  Award,
  TrendingUp,
  Calendar,
  CheckCircle2,
  Clock,
  ArrowRight,
  AlertCircle,
  Sparkles,
  ChevronRight,
} from "lucide-react";
import { api } from "@/lib/api/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { formatDate, formatDateTime } from "@/lib/utils";

export default function ManagerDashboardPage() {
  const { data: dashboard, isLoading, error, refetch } = useQuery({
    queryKey: ["manager-dashboard"],
    queryFn: () => api.manager.getDashboard(),
  });

  if (isLoading) return <LoadingState rows={8} />;
  if (error || !dashboard) {
    return (
      <ErrorState
        message={error instanceof Error ? error.message : "Failed to load manager dashboard."}
        onRetry={() => refetch()}
      />
    );
  }

  const { pending, team_goal_progress, review_cycle_progress, top_team_gaps, readiness, upcoming_one_on_ones } =
    dashboard;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Manager Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">
          Engineering Team · People leadership, pending approvals, team goals, and appraisal milestones.
        </p>
      </div>

      {/* 4 Pending Action Cards Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link href="/manager/goals">
          <Card
            className={`transition-all hover:shadow-xs cursor-pointer ${
              pending?.goal_approvals > 0 ? "border-amber-300 bg-amber-50/30" : "hover:border-slate-300"
            }`}
          >
            <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
              <span className="text-xs font-semibold text-slate-700">Goal Approvals</span>
              <Target className={`w-4 h-4 ${pending?.goal_approvals > 0 ? "text-amber-600" : "text-slate-400"}`} />
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <span className="text-2xl font-bold text-slate-900">{pending?.goal_approvals ?? 0}</span>
              <span className="text-[11px] text-slate-500 block mt-0.5">Pending employee goals</span>
            </CardContent>
          </Card>
        </Link>

        <Link href="/manager/reviews">
          <Card
            className={`transition-all hover:shadow-xs cursor-pointer ${
              pending?.reviews_due > 0 ? "border-indigo-300 bg-indigo-50/30" : "hover:border-slate-300"
            }`}
          >
            <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
              <span className="text-xs font-semibold text-slate-700">Reviews Due</span>
              <FileText className={`w-4 h-4 ${pending?.reviews_due > 0 ? "text-indigo-600" : "text-slate-400"}`} />
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <span className="text-2xl font-bold text-slate-900">{pending?.reviews_due ?? 0}</span>
              <span className="text-[11px] text-slate-500 block mt-0.5">Manager reviews awaiting input</span>
            </CardContent>
          </Card>
        </Link>

        <Link href="/manager/skill-validation">
          <Card
            className={`transition-all hover:shadow-xs cursor-pointer ${
              pending?.skill_validations > 0 ? "border-rose-300 bg-rose-50/30" : "hover:border-slate-300"
            }`}
          >
            <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
              <span className="text-xs font-semibold text-slate-700">Skill Validations</span>
              <Award className={`w-4 h-4 ${pending?.skill_validations > 0 ? "text-rose-600" : "text-slate-400"}`} />
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <span className="text-2xl font-bold text-slate-900">{pending?.skill_validations ?? 0}</span>
              <span className="text-[11px] text-slate-500 block mt-0.5">Competencies to confirm</span>
            </CardContent>
          </Card>
        </Link>

        <Link href="/manager/development-plans">
          <Card
            className={`transition-all hover:shadow-xs cursor-pointer ${
              pending?.plans_awaiting_approval > 0 ? "border-blue-300 bg-blue-50/30" : "hover:border-slate-300"
            }`}
          >
            <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
              <span className="text-xs font-semibold text-slate-700">Plan Approvals</span>
              <TrendingUp className={`w-4 h-4 ${pending?.plans_awaiting_approval > 0 ? "text-blue-600" : "text-slate-400"}`} />
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <span className="text-2xl font-bold text-slate-900">{pending?.plans_awaiting_approval ?? 0}</span>
              <span className="text-[11px] text-slate-500 block mt-0.5">Development roadmaps</span>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Team Goal Progress */}
        <Card>
          <CardHeader className="p-6 pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold text-slate-900">Team Goal Progress</CardTitle>
              <CardDescription className="text-xs text-slate-500 mt-0.5">
                Current active quarter milestone completion rate
              </CardDescription>
            </div>
            <Link href="/manager/goals" className="text-xs font-medium text-indigo-600 hover:underline flex items-center">
              View Goals <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Link>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="space-y-1.5 pb-2 border-b border-slate-100">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-slate-800">Overall Team Completion</span>
                <span className="text-indigo-600 font-bold">{team_goal_progress?.overall_pct ?? 0}%</span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, team_goal_progress?.overall_pct ?? 0)}%` }}
                />
              </div>
            </div>

            <div className="space-y-3">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Direct Reports Breakdown
              </span>
              {team_goal_progress?.by_employee?.map((e: any) => (
                <div key={e.employee_id} className="flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-900">{e.name}</span>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-slate-600 font-semibold">{e.weighted_score}</span>
                    <span className="text-[10px] text-slate-400">weighted score</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Review Cycle Progress */}
        <Card>
          <CardHeader className="p-6 pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold text-slate-900">
                Active Review Cycle
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 mt-0.5">
                {review_cycle_progress?.cycle?.name || "H2 Annual Review"}
              </CardDescription>
            </div>
            <Link href="/manager/reviews" className="text-xs font-medium text-indigo-600 hover:underline flex items-center">
              Team Reviews <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Link>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="space-y-1.5 pb-3 border-b border-slate-100">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-slate-800">Team Appraisal Progress</span>
                <span className="text-emerald-600 font-bold">{review_cycle_progress?.completion_pct ?? 0}%</span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, review_cycle_progress?.completion_pct ?? 0)}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-slate-500 block text-[11px]">Self-Assessments</span>
                <span className="font-bold text-slate-900 text-sm mt-0.5 block">
                  {review_cycle_progress?.counts?.SELF_ASSESSMENT ?? 0} in progress
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-slate-500 block text-[11px]">Manager Review</span>
                <span className="font-bold text-indigo-600 text-sm mt-0.5 block">
                  {review_cycle_progress?.counts?.MANAGER_REVIEW ?? 0} awaiting you
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top Team Skill Gaps */}
        <Card>
          <CardHeader className="p-6 pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold text-slate-900">Top Team Skill Gaps</CardTitle>
              <CardDescription className="text-xs text-slate-500 mt-0.5">
                Common gaps identified against target career roles
              </CardDescription>
            </div>
            <Link href="/manager/skill-validation" className="text-xs font-medium text-indigo-600 hover:underline flex items-center">
              Validate Skills <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Link>
          </CardHeader>
          <CardContent className="p-6 space-y-3">
            {top_team_gaps?.map((gap: any, i: number) => (
              <div
                key={gap.skill}
                className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 bg-slate-50/50 text-xs"
              >
                <div className="flex items-center space-x-3">
                  <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center">
                    {i + 1}
                  </span>
                  <div>
                    <span className="font-bold text-slate-900 block">{gap.skill}</span>
                    <span className="text-[11px] text-slate-500">{gap.affected_count} team members impacted</span>
                  </div>
                </div>
                <Badge variant="warning" className="text-[10px]">
                  Avg Gap: -{gap.avg_gap}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Upcoming 1:1 Meetings */}
        <Card>
          <CardHeader className="p-6 pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold text-slate-900">Upcoming 1:1 Meetings</CardTitle>
              <CardDescription className="text-xs text-slate-500 mt-0.5">
                Next scheduled alignment and coaching check-ins
              </CardDescription>
            </div>
            <Link href="/manager/one-on-ones" className="text-xs font-medium text-indigo-600 hover:underline flex items-center">
              Manage 1:1s <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Link>
          </CardHeader>
          <CardContent className="p-6 space-y-3">
            {upcoming_one_on_ones?.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center italic">No upcoming 1:1 meetings scheduled.</p>
            ) : (
              upcoming_one_on_ones?.map((item: any) => (
                <div
                  key={item.id}
                  className="p-3 rounded-lg border border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs">
                      {item.employee?.name?.split(" ").map((n: string) => n[0]).slice(0, 2).join("")}
                    </div>
                    <div>
                      <span className="font-semibold text-slate-900 block">{item.employee?.name}</span>
                      <span className="text-[11px] text-slate-500 flex items-center">
                        <Clock className="w-3 h-3 mr-1 text-slate-400" />
                        {item.scheduled_at ? formatDateTime(item.scheduled_at) : "Scheduled Soon"}
                      </span>
                    </div>
                  </div>
                  <Link href="/manager/one-on-ones">
                    <Button variant="outline" size="sm" className="h-7 text-xs bg-white">
                      Open Notes
                    </Button>
                  </Link>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
