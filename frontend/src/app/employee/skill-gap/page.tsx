"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Compass,
  Briefcase,
  AlertCircle,
  CheckCircle2,
  BookOpen,
  ArrowRight,
  Info,
  HelpCircle,
} from "lucide-react";
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  Tooltip,
} from "recharts";
import { api, fetchApi } from "@/lib/api/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusChip } from "@/components/shared/StatusChip";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";

interface GapItem {
  skill: {
    id: string;
    name: string;
  };
  required: number;
  validated: number;
  self: number | null;
  gap: number;
  weight: number;
  is_must_have: boolean;
  status: string;
  priority: number;
  why_it_matters: string;
}

export default function SkillGapPage() {
  const [selectedTargetRole, setSelectedTargetRole] = useState("");

  // Queries
  const { data: roles } = useQuery({
    queryKey: ["all-job-roles"],
    queryFn: () => api.jobRoles.list(),
  });
  const roleList = Array.isArray(roles) ? roles : (roles as any)?.results || [];

  const {
    data: gapAnalysis,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["skill-gap-analysis", selectedTargetRole],
    queryFn: () => {
      const sp = new URLSearchParams();
      sp.append("employee", "me");
      if (selectedTargetRole) sp.append("target_role", selectedTargetRole);
      return fetchApi<any>(`/skills/gaps/?${sp.toString()}`);
    },
  });

  if (isLoading) return <LoadingState rows={8} />;
  if (error || !gapAnalysis) {
    return (
      <ErrorState
        message={error instanceof Error ? error.message : "Failed to load skill gap analysis."}
        onRetry={() => refetch()}
      />
    );
  }

  const { target_role, coverage, must_haves_remaining, items, radar } = gapAnalysis;

  // Transform radar data for Recharts
  const radarChartData = (radar?.axes || []).map((axis: string, idx: number) => ({
    subject: axis,
    Required: radar.required[idx] || 0,
    Validated: radar.validated[idx] || 0,
    fullMark: 5,
  }));

  const gapItems: GapItem[] = items || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Skill Gap Analysis</h1>
          <p className="text-sm text-slate-500 mt-1">
            Compare validated capabilities against your target promotion role to plan strategic learning.
          </p>
        </div>
        <Link href="/employee/learning">
          <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white">
            <BookOpen className="w-4 h-4 mr-1.5" />
            Recommended Learning
          </Button>
        </Link>
      </div>

      {/* Target Role Selector Toolbar */}
      <Card>
        <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-2.5">
            <Briefcase className="w-5 h-5 text-indigo-600 shrink-0" />
            <div>
              <span className="text-xs font-semibold text-slate-900 block">Target Role</span>
              <span className="text-[11px] text-slate-500">
                Active Benchmark: <strong>{target_role?.title || "Senior Backend Developer"}</strong>
              </span>
            </div>
          </div>

          <div className="w-full sm:w-72">
            <select
              value={selectedTargetRole || target_role?.id || ""}
              onChange={(e) => setSelectedTargetRole(e.target.value)}
              className="w-full h-9 px-3 rounded-md border border-slate-300 bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600"
            >
              {roleList.map((r: any) => (
                <option key={r.id} value={r.id}>
                  {r.title} ({r.track} - L{r.level})
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Summary Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="p-4 pb-2">
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
              Overall Skill Coverage
            </span>
            <div className="flex items-baseline space-x-2 mt-1">
              <span className="text-3xl font-extrabold text-indigo-600">
                {Math.round(Number(coverage || 0.72) * 100)}%
              </span>
              <span className="text-xs text-slate-500">of required points</span>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-2">
            <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full bg-indigo-600 rounded-full"
                style={{ width: `${Math.min(100, Math.round(Number(coverage || 0.72) * 100))}%` }}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-2">
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
              Must-Have Skills Remaining
            </span>
            <div className="flex items-baseline space-x-2 mt-1">
              <span className={`text-3xl font-extrabold ${must_haves_remaining > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                {must_haves_remaining}
              </span>
              <span className="text-xs text-slate-500">critical competencies</span>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-2">
            <span className="text-[11px] text-slate-500">
              {must_haves_remaining > 0
                ? "Mandatory for executive promotion approval."
                : "All critical mandatory skills achieved!"}
            </span>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-2">
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
              Competencies Analyzed
            </span>
            <div className="flex items-baseline space-x-2 mt-1">
              <span className="text-3xl font-extrabold text-slate-900">{gapItems.length}</span>
              <span className="text-xs text-slate-500">required skills</span>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-2">
            <span className="text-[11px] text-emerald-600 font-medium">
              Based on validated assessments only.
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Radar Chart Section */}
      <Card>
        <CardHeader className="p-6 pb-2 border-b border-slate-100 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold text-slate-900">
              Competency Radar Comparison
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Comparing Required Level vs Validated Level across benchmark competencies
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-6 flex flex-col items-center">
          <div className="h-72 w-full max-w-lg">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarChartData}>
                <PolarGrid stroke="#CBD5E1" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: "#334155", fontSize: 12 }} />
                <PolarRadiusAxis angle={30} domain={[0, 5]} stroke="#94A3B8" />
                <Radar
                  name="Required Level"
                  dataKey="Required"
                  stroke="#94A3B8"
                  fill="#94A3B8"
                  fillOpacity={0.2}
                />
                <Radar
                  name="Validated Level"
                  dataKey="Validated"
                  stroke="#4F46E5"
                  fill="#4F46E5"
                  fillOpacity={0.4}
                />
                <Legend wrapperStyle={{ paddingTop: "10px", fontSize: "12px" }} />
                <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #E2E8F0" }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Priority Gap Table */}
      <Card>
        <CardHeader className="p-6 pb-4 border-b border-slate-100 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold text-slate-900">Prioritized Competency Gap Table</CardTitle>
            <CardDescription className="text-xs text-slate-500 mt-0.5">
              Ranked by importance and weight for target role promotion
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-56">Skill / Competency</TableHead>
                  <TableHead>Required</TableHead>
                  <TableHead>Validated</TableHead>
                  <TableHead>Self</TableHead>
                  <TableHead>Gap</TableHead>
                  <TableHead>Weight</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-80">Why This Matters</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {gapItems.map((item) => (
                  <TableRow key={item.skill.id} className="hover:bg-slate-50/75">
                    <TableCell className="font-semibold text-xs text-slate-900">
                      <div className="flex items-center space-x-1.5">
                        <span>{item.skill.name}</span>
                        {item.is_must_have && (
                          <Badge variant="destructive" className="text-[9px] px-1.5 py-0 uppercase">
                            Must-Have
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-slate-700">Level {item.required}</TableCell>
                    <TableCell className="text-xs font-bold text-indigo-600">
                      {item.validated ? `Level ${item.validated}` : <span className="text-slate-400 font-normal italic">0</span>}
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">
                      {item.self ? `Level ${item.self}` : "—"}
                    </TableCell>
                    <TableCell>
                      {item.gap > 0 ? (
                        <Badge variant="warning" className="text-xs font-bold">
                          -{item.gap}
                        </Badge>
                      ) : (
                        <Badge variant="success" className="text-xs font-bold">
                          Met
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-slate-600 font-mono">{item.weight}x</TableCell>
                    <TableCell>
                      <StatusChip status={item.status === "GAP" ? "DEVELOPING" : "VALIDATED"} />
                    </TableCell>
                    <TableCell className="text-xs text-slate-600">
                      <div className="flex items-start space-x-1.5">
                        <Info className="w-3.5 h-3.5 text-indigo-500 mt-0.5 shrink-0" />
                        <span className="leading-snug">{item.why_it_matters}</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
