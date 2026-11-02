"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Award,
  AlertTriangle,
  GraduationCap,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Shield,
  Layers,
} from "lucide-react";
import { fetchApi } from "@/lib/api/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";

interface HeatmapResponse {
  departments: string[];
  skills: string[];
  cells: number[][];
  legend: Array<{ min: number; max: number; label: string }>;
}

interface ShortageItem {
  skill_id: string;
  skill_name: string;
  category: string;
  current_supply: number;
  required_demand: number;
  shortage_gap: number;
  urgency: "HIGH" | "MEDIUM" | "LOW";
}

interface FocusAreaItem {
  skill: string;
  rationale: string;
  suggested_actions: string[];
}

export default function ExecutiveSkillsPage() {
  const { data: heatmapData, isLoading: heatLoading } = useQuery({
    queryKey: ["exec-skill-heatmap"],
    queryFn: () => fetchApi<HeatmapResponse>("/analytics/executive/skill-heatmap/"),
  });

  const { data: shortagesData, isLoading: shortLoading } = useQuery({
    queryKey: ["exec-shortage-ranking"],
    queryFn: () => fetchApi<ShortageItem[]>("/analytics/executive/shortage-ranking/"),
  });

  const { data: effectivenessData, isLoading: effLoading } = useQuery({
    queryKey: ["exec-training-effectiveness"],
    queryFn: () => fetchApi<any[]>("/analytics/executive/training-effectiveness/"),
  });

  const { data: focusAreas, isLoading: focusLoading } = useQuery({
    queryKey: ["exec-focus-areas"],
    queryFn: () => fetchApi<FocusAreaItem[]>("/analytics/executive/focus-areas/"),
  });

  const isLoading = heatLoading || shortLoading || effLoading || focusLoading;
  if (isLoading) return <LoadingState rows={8} />;

  const getCellBg = (val: number) => {
    if (val >= 4.0) return "bg-indigo-600 text-white font-bold";
    if (val >= 3.0) return "bg-indigo-100 text-indigo-900 font-semibold";
    if (val >= 2.0) return "bg-slate-100 text-slate-800";
    return "bg-amber-50 text-amber-800";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Skills Health & Capability Shortages</h1>
        <p className="text-sm text-slate-500 mt-1">
          Strategic competency distribution across business units, organizational shortage rankings, and focus interventions.
        </p>
      </div>

      {/* Skills-by-Department Distribution Heatmap */}
      <Card>
        <CardHeader className="p-6 pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold text-slate-900">
              Department Competency Heatmap
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 mt-0.5">
              Average validated proficiency level (1.0–5.0) by department
            </CardDescription>
          </div>
          {/* Legend */}
          <div className="hidden sm:flex items-center space-x-3 text-[11px]">
            <span className="flex items-center"><span className="w-2.5 h-2.5 rounded bg-amber-50 mr-1.5 border border-amber-200" />&lt;2.0 Foundational</span>
            <span className="flex items-center"><span className="w-2.5 h-2.5 rounded bg-slate-100 mr-1.5 border border-slate-200" />2.0–2.9 Working</span>
            <span className="flex items-center"><span className="w-2.5 h-2.5 rounded bg-indigo-100 mr-1.5 border border-indigo-200" />3.0–3.9 Proficient</span>
            <span className="flex items-center"><span className="w-2.5 h-2.5 rounded bg-indigo-600 mr-1.5" />&ge;4.0 Advanced</span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-48 font-bold text-slate-900">Department</TableHead>
                  {heatmapData?.skills.map((s) => (
                    <TableHead key={s} className="text-center font-medium text-xs whitespace-nowrap px-3">
                      {s}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {heatmapData?.departments.map((dept, rowIdx) => (
                  <TableRow key={dept} className="hover:bg-slate-50/75">
                    <TableCell className="font-semibold text-xs text-slate-900">{dept}</TableCell>
                    {heatmapData.cells[rowIdx]?.map((val, colIdx) => (
                      <TableCell key={colIdx} className="text-center p-2">
                        <span className={`inline-block w-12 py-1 rounded text-xs text-center ${getCellBg(val)}`}>
                          {val.toFixed(1)}
                        </span>
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* 2-Column Grid: Shortages Ranking & Strategic Focus Areas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Critical Shortages Ranking Table */}
        <Card>
          <CardHeader className="p-6 pb-3 border-b border-slate-100">
            <CardTitle className="text-base font-semibold text-slate-900 flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>Prioritized Capability Shortages</span>
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 mt-0.5">
              Ranked competencies with widest deficit against role requirements
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Skill</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Supply / Demand</TableHead>
                  <TableHead className="text-right">Shortage Index</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shortagesData?.slice(0, 6).map((item) => (
                  <TableRow key={item.skill_id} className="hover:bg-slate-50/75 text-xs">
                    <TableCell className="font-semibold text-slate-900">{item.skill_name}</TableCell>
                    <TableCell className="text-slate-500">{item.category}</TableCell>
                    <TableCell className="text-slate-600 font-mono">
                      {item.current_supply} / {item.required_demand}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge
                        variant={item.urgency === "HIGH" ? "destructive" : "warning"}
                        className="text-[10px] font-bold"
                      >
                        {item.urgency} DEFICIT
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Workforce Development Focus Areas */}
        <Card>
          <CardHeader className="p-6 pb-3 border-b border-slate-100">
            <CardTitle className="text-base font-semibold text-slate-900 flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <span>Workforce Development Focus Areas</span>
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 mt-0.5">
              Rule-based intervention suggestions derived from shortage analysis
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            {focusAreas?.map((fa, idx) => (
              <div key={idx} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2 text-xs">
                <div className="flex items-center space-x-2">
                  <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 font-bold text-[10px] flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  <h4 className="font-bold text-slate-900 text-xs">{fa.skill}</h4>
                </div>
                <p className="text-slate-600 leading-snug">{fa.rationale}</p>
                <div className="space-y-1 pt-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                    Recommended Actions
                  </span>
                  {fa.suggested_actions.map((act, aIdx) => (
                    <div key={aIdx} className="flex items-start space-x-2 text-slate-700">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 mt-1.5 shrink-0" />
                      <span>{act}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
