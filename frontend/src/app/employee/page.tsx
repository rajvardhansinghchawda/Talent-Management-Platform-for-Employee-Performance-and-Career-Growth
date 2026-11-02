"use client";

import React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Target,
  FileText,
  Award,
  BookOpen,
  Briefcase,
  Calendar,
  MessageSquare,
  Sparkles,
  CheckCircle2,
  Clock,
  ArrowRight,
  TrendingUp,
  CheckSquare,
  Compass,
} from "lucide-react";
import { api, fetchApi } from "@/lib/api/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { StatusChip } from "@/components/shared/StatusChip";
import { formatDate } from "@/lib/utils";

export default function EmployeeDashboardPage() {
  const {
    data: dashboard,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["employee-dashboard"],
    queryFn: () => fetchApi<any>("/dashboards/employee/"),
  });

  if (isLoading) return <LoadingState rows={8} />;
  if (error || !dashboard) {
    return (
      <ErrorState
        message={error instanceof Error ? error.message : "Failed to load dashboard metrics."}
        onRetry={() => refetch()}
      />
    );
  }

  const {
    greeting_name,
    goal_progress,
    active_review,
    target_role,
    top_gaps,
    recommended_courses,
    readiness,
    recent_feedback,
    recognition,
    upcoming_one_on_ones,
    action_items,
  } = dashboard;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Welcome back, {greeting_name}!
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Here is your active performance summary, competency growth progress, and next milestones.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Link href="/employee/goals/new">
            <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white">
              <Target className="w-4 h-4 mr-1.5" />
              New Goal
            </Button>
          </Link>
          <Link href="/employee/skill-gap">
            <Button size="sm" variant="outline" className="bg-white">
              <Compass className="w-4 h-4 mr-1.5 text-slate-500" />
              View Skill Gap
            </Button>
          </Link>
        </div>
      </div>

      {/* TOP SUMMARY ROW: Goal Progress & Active Review Stepper */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Goal Progress Card */}
        <Card className="border-slate-200">
          <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold text-slate-900">Overall Goal Score</CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Weighted performance across quarterly deliverables
              </CardDescription>
            </div>
            <div className="text-right">
              <span className="text-2xl font-bold text-indigo-600 block">
                {Math.round((goal_progress?.weighted_score ?? 0.85) * 100)}%
              </span>
              <span className="text-[10px] text-slate-400">Target: 100%</span>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.round((goal_progress?.weighted_score ?? 0.85) * 100))}%` }}
              />
            </div>

            <div className="space-y-2.5 pt-2">
              <span className="text-xs font-semibold text-slate-700 block">Top Key Deliverables:</span>
              {goal_progress?.top_goals?.map((g: any) => (
                <Link
                  key={g.id}
                  href={`/employee/goals/${g.id}`}
                  className="p-2.5 rounded-lg border border-slate-100 bg-slate-50/50 hover:bg-slate-50 flex items-center justify-between text-xs transition-colors block"
                >
                  <div className="space-y-0.5">
                    <span className="font-semibold text-slate-900 block truncate max-w-xs">{g.title}</span>
                    <span className="text-[11px] text-slate-500">Due {formatDate(g.due_date)}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-slate-700">{g.progress_pct}%</span>
                    <StatusChip status={g.status} />
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Active Review Cycle Stepper Card */}
        <Card className="border-slate-200">
          <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold text-slate-900">Active Review Cycle</CardTitle>
              <CardDescription className="text-xs text-slate-500">
                {active_review ? active_review.cycle_name : "No review in progress"}
              </CardDescription>
            </div>
            {active_review && <StatusChip status={active_review.status} />}
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            {active_review ? (
              <>
                {/* Horizontal Stepper */}
                <div className="grid grid-cols-4 gap-2 text-center text-xs">
                  {active_review.steps.map((step: any, idx: number) => {
                    const isDone = step.state === "DONE";
                    const isCurrent = step.state === "CURRENT";
                    return (
                      <div key={step.key} className="space-y-2">
                        <div
                          className={`w-8 h-8 rounded-full mx-auto flex items-center justify-center font-bold text-xs ${
                            isDone
                              ? "bg-emerald-600 text-white"
                              : isCurrent
                              ? "bg-indigo-600 text-white ring-4 ring-indigo-100"
                              : "bg-slate-100 text-slate-400"
                          }`}
                        >
                          {isDone ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                        </div>
                        <span className={`block text-[11px] font-medium leading-tight ${isCurrent ? "text-indigo-600 font-semibold" : "text-slate-600"}`}>
                          {step.label}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="p-3.5 rounded-lg bg-indigo-50/50 border border-indigo-100 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-slate-900 block">Next Action Required</span>
                    <span className="text-slate-600 text-[11px]">
                      Self-assessment due by {formatDate(active_review.due_dates.self_assessment)}
                    </span>
                  </div>
                  <Link href={`/employee/reviews/${active_review.id}`}>
                    <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs">
                      Start Self-Assessment
                    </Button>
                  </Link>
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-xs text-slate-400">
                No active performance review cycle requiring your action.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* MIDDLE ROW: Skill Gaps, Recommended Courses, Career Readiness */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Top Skill Gaps */}
        <Card>
          <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold text-slate-900">Top Skill Gaps</CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Target: {target_role?.title || "Senior Role"}
              </CardDescription>
            </div>
            <Link href="/employee/skill-gap" className="text-xs font-semibold text-indigo-600 hover:underline">
              Full Gap Analysis
            </Link>
          </CardHeader>
          <CardContent className="p-4 space-y-2.5">
            {top_gaps?.length === 0 ? (
              <p className="text-xs text-slate-400 py-3 text-center">No skill gaps identified.</p>
            ) : (
              top_gaps?.map((gap: any) => (
                <div key={gap.skill?.name || gap.name} className="p-2.5 rounded-lg border border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-slate-900 block">{gap.skill?.name || gap.name}</span>
                    <span className="text-[11px] text-slate-500">
                      Current: L{gap.validated ?? gap.self ?? 1} · Req: L{gap.required ?? 4}
                    </span>
                  </div>
                  <Badge variant="warning" className="text-[10px]">
                    Gap: -{gap.gap ?? 1}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Recommended Courses */}
        <Card>
          <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold text-slate-900">Recommended Learning</CardTitle>
              <CardDescription className="text-xs text-slate-500">Tailored to close open skill gaps</CardDescription>
            </div>
            <Link href="/employee/learning" className="text-xs font-semibold text-indigo-600 hover:underline">
              Catalog
            </Link>
          </CardHeader>
          <CardContent className="p-4 space-y-2.5">
            {recommended_courses?.map((c: any) => (
              <div key={c.id} className="p-2.5 rounded-lg border border-slate-100 bg-slate-50/50 space-y-1 text-xs">
                <div className="flex justify-between items-start">
                  <span className="font-semibold text-slate-900 truncate max-w-[180px]">{c.title}</span>
                  <Badge variant="secondary" className="text-[10px]">{c.difficulty}</Badge>
                </div>
                <p className="text-[11px] text-indigo-600 font-medium">{c.reason}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Career Readiness */}
        <Card>
          <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold text-slate-900">Career Readiness</CardTitle>
              <CardDescription className="text-xs text-slate-500">Target Role Progression</CardDescription>
            </div>
            <Link href="/employee/career" className="text-xs font-semibold text-indigo-600 hover:underline">
              Career Path
            </Link>
          </CardHeader>
          <CardContent className="p-6 text-center space-y-3">
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 inline-block">
              <span className="text-[11px] font-bold text-amber-700 block uppercase tracking-wider">
                {readiness?.status || "DEVELOPING"}
              </span>
              <span className="text-xl font-extrabold text-amber-900 mt-0.5 block">
                {readiness?.summary || "Target competencies in progress."}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 italic">
              Readiness is advisory and reviewed by your manager and HR.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* LOWER ROW: Feedback, Recognition, 1:1 Meetings & Action Items */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Recent Feedback */}
        <Card>
          <CardHeader className="p-4 pb-2 border-b border-slate-100">
            <CardTitle className="text-xs font-semibold text-slate-900 flex items-center justify-between">
              <Link href="/employee/feedback" className="hover:text-indigo-600 transition-colors">
                Recent Feedback
              </Link>
              <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-2 text-xs">
            {recent_feedback?.length === 0 ? (
              <p className="text-slate-400 text-center py-3">No feedback received yet.</p>
            ) : (
              recent_feedback?.map((f: any) => (
                <div key={f.id} className="p-2 rounded bg-slate-50 border border-slate-100 space-y-0.5">
                  <div className="flex justify-between items-center text-[10px] text-slate-500">
                    <span className="font-semibold text-slate-700">{f.author}</span>
                    <span>{formatDate(f.created_at)}</span>
                  </div>
                  <p className="text-[11px] text-slate-600 line-clamp-2">{f.preview}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Recognition Badges */}
        <Card>
          <CardHeader className="p-4 pb-2 border-b border-slate-100">
            <CardTitle className="text-xs font-semibold text-slate-900 flex items-center justify-between">
              <Link href="/employee/recognition" className="hover:text-indigo-600 transition-colors">
                Recognition Badges
              </Link>
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-2 text-xs">
            {recognition?.length === 0 ? (
              <p className="text-slate-400 text-center py-3">No badges awarded yet.</p>
            ) : (
              recognition?.map((r: any, i: number) => (
                <div key={i} className="p-2 rounded bg-indigo-50/50 border border-indigo-100 flex items-center space-x-2">
                  <Award className="w-5 h-5 text-indigo-600 shrink-0" />
                  <div>
                    <span className="font-semibold text-slate-900 block text-[11px]">{r.badge}</span>
                    <span className="text-[10px] text-slate-500">From {r.from}</span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Upcoming 1:1 Meetings */}
        <Card>
          <CardHeader className="p-4 pb-2 border-b border-slate-100">
            <CardTitle className="text-xs font-semibold text-slate-900 flex items-center justify-between">
              <Link href="/employee/one-on-ones" className="hover:text-indigo-600 transition-colors">
                Upcoming 1:1s
              </Link>
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-2 text-xs">
            {upcoming_one_on_ones?.length === 0 ? (
              <p className="text-slate-400 text-center py-3">No meetings scheduled.</p>
            ) : (
              upcoming_one_on_ones?.map((o: any) => (
                <div key={o.id} className="p-2 rounded bg-slate-50 border border-slate-100 space-y-0.5">
                  <span className="font-semibold text-slate-900 block text-[11px]">Sync with {o.with}</span>
                  <span className="text-[10px] text-slate-500 block">{formatDate(o.scheduled_at)} at 10:00 AM</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Action Items */}
        <Card>
          <CardHeader className="p-4 pb-2 border-b border-slate-100">
            <CardTitle className="text-xs font-semibold text-slate-900 flex items-center justify-between">
              <Link href="/employee/development-plan" className="hover:text-indigo-600 transition-colors">
                Action Items
              </Link>
              <CheckSquare className="w-3.5 h-3.5 text-slate-400" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-2 text-xs">
            {action_items?.length === 0 ? (
              <p className="text-slate-400 text-center py-3">No pending action items.</p>
            ) : (
              action_items?.map((a: any) => (
                <div key={a.id} className="p-2 rounded bg-slate-50 border border-slate-100 flex items-start space-x-2">
                  <div className="w-2 h-2 rounded-full bg-indigo-600 mt-1 shrink-0" />
                  <span className="text-[11px] text-slate-700 leading-tight">{a.title}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
