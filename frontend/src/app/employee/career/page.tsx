"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Briefcase,
  GitCommit,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  ShieldAlert,
  Info,
} from "lucide-react";
import { api, fetchApi } from "@/lib/api/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusChip } from "@/components/shared/StatusChip";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";

export default function CareerPage() {
  const [targetRoleId, setTargetRoleId] = useState("");

  const { data: roles } = useQuery({
    queryKey: ["all-roles"],
    queryFn: () => api.jobRoles.list(),
  });
  const roleList = Array.isArray(roles) ? roles : (roles as any)?.results || [];

  const { data: pathGraph, isLoading: graphLoading } = useQuery({
    queryKey: ["career-path-graph"],
    queryFn: () => fetchApi<any>("/careers/paths/?from_role=me"),
  });

  const {
    data: readinessData,
    isLoading: readyLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["career-readiness", targetRoleId],
    queryFn: () => {
      const sp = new URLSearchParams();
      sp.append("employee", "me");
      if (targetRoleId) sp.append("target_role", targetRoleId);
      return fetchApi<any>(`/careers/readiness/?${sp.toString()}`);
    },
  });

  if (graphLoading || readyLoading) return <LoadingState rows={8} />;
  if (error || !readinessData) {
    return (
      <ErrorState
        message={error instanceof Error ? error.message : "Failed to load career data."}
        onRetry={() => refetch()}
      />
    );
  }

  const { status, coverage, criteria, advisory_text } = readinessData;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Career Progression & Readiness</h1>
        <p className="text-sm text-slate-500 mt-1">
          Explore career mobility paths, target promotion criteria, and explainable promotion readiness.
        </p>
      </div>

      {/* Target Role Selector Toolbar */}
      <Card>
        <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-2.5">
            <Briefcase className="w-5 h-5 text-indigo-600 shrink-0" />
            <div>
              <span className="text-xs font-semibold text-slate-900 block">Target Progression Role</span>
              <span className="text-[11px] text-slate-500">Benchmark for readiness and criteria verification</span>
            </div>
          </div>

          <div className="w-full sm:w-72">
            <select
              value={targetRoleId}
              onChange={(e) => setTargetRoleId(e.target.value)}
              className="w-full h-9 px-3 rounded-md border border-slate-300 bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600"
            >
              <option value="">Default (Senior Backend Developer)</option>
              {roleList.map((r: any) => (
                <option key={r.id} value={r.id}>
                  {r.title} ({r.track} - L{r.level})
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Career Path Graph Section */}
      <Card>
        <CardHeader className="p-6 pb-2 border-b border-slate-100">
          <CardTitle className="text-base font-semibold text-slate-900 flex items-center space-x-2">
            <GitCommit className="w-4 h-4 text-indigo-600" />
            <span>Career Path Progression Graph</span>
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            Validated advancement tracks and progression milestones
          </CardDescription>
        </CardHeader>
        <CardContent className="p-8">
          <div className="flex flex-col md:flex-row items-center justify-center gap-6 md:gap-12">
            {/* Current Role Node */}
            <div className="p-5 rounded-xl border-2 border-slate-300 bg-slate-50 text-center w-64 shadow-xs">
              <Badge variant="secondary" className="text-[10px] uppercase font-bold mb-2">
                Current Role
              </Badge>
              <h4 className="font-bold text-sm text-slate-900">Junior Software Engineer</h4>
              <span className="text-xs text-slate-500 block mt-0.5">Engineering Track · Level 1</span>
            </div>

            {/* Transition Arrow */}
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100 mb-1">
                Typical: 24 Months
              </span>
              <ArrowRight className="w-6 h-6 text-indigo-600 hidden md:block" />
            </div>

            {/* Target Role Node */}
            <div className="p-5 rounded-xl border-2 border-indigo-600 bg-indigo-50/40 text-center w-64 shadow-sm ring-4 ring-indigo-50">
              <Badge variant="default" className="text-[10px] uppercase font-bold mb-2 bg-indigo-600 text-white border-none">
                Target Promotion Role
              </Badge>
              <h4 className="font-bold text-sm text-slate-900">Senior Backend Developer</h4>
              <span className="text-xs text-slate-500 block mt-0.5">Engineering Track · Level 3</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Readiness Section with Checklist */}
      <Card>
        <CardHeader className="p-6 pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold text-slate-900">Promotion Readiness Status</CardTitle>
            <CardDescription className="text-xs text-slate-500 mt-0.5">
              Explainable threshold evaluation against target competencies
            </CardDescription>
          </div>
          <StatusChip status={status} />
        </CardHeader>
        <CardContent className="p-6 space-y-6 text-xs">
          {/* Readiness Status Box */}
          <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <span className="text-[10px] uppercase font-bold text-amber-700 block tracking-wider">
                Current Readiness State
              </span>
              <span className="text-2xl font-extrabold text-amber-950 mt-0.5 block">
                {status.replace(/_/g, " ")}
              </span>
              <p className="text-xs text-amber-900 mt-1">
                Achieved <strong>{Math.round(coverage * 100)}%</strong> of required competency points.
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-400 block italic">{advisory_text}</span>
            </div>
          </div>

          {/* Criteria Checklist */}
          <div className="space-y-3">
            <h4 className="font-semibold text-slate-900 text-xs">Readiness Evaluation Criteria Checklist</h4>
            <div className="space-y-2.5">
              {criteria?.map((c: any) => (
                <div
                  key={c.key}
                  className="p-3.5 rounded-lg border border-slate-200 bg-white flex items-center justify-between"
                >
                  <div className="flex items-center space-x-3">
                    {c.passed ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    ) : (
                      <XCircle className="w-5 h-5 text-amber-500 shrink-0" />
                    )}
                    <div>
                      <span className="font-semibold text-slate-900 block">{c.name}</span>
                      <span className="text-[11px] text-slate-500">{c.detail}</span>
                    </div>
                  </div>
                  <Badge variant={c.passed ? "success" : "warning"} className="text-[10px]">
                    {c.passed ? "Met" : "In Progress"}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
