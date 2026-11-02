"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Briefcase,
  Users,
  TrendingUp,
  Shield,
  Layers,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
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

interface BenchStrengthItem {
  role_id: string;
  title: string;
  track: string;
  level: number;
  ready_count: string;
  near_ready_count: string;
  feeder_headcount: number;
  suppressed: boolean;
  health: "STRONG" | "ADEQUATE" | "NEEDS_ATTENTION";
}

interface NineBoxResponse {
  grid: Array<{
    row: number;
    col: number;
    label: string;
    count: number;
    category: string;
  }>;
  suppression: { applied: boolean; min_group_size: number };
}

interface MobilityTrendsResponse {
  periods: string[];
  promotions: number[];
  lateral_moves: number[];
}

export default function ReadinessSuccessionPage() {
  const { data: benchStrength, isLoading: benchLoading } = useQuery({
    queryKey: ["exec-bench-strength"],
    queryFn: () => fetchApi<BenchStrengthItem[]>("/analytics/executive/bench-strength/"),
  });

  const { data: nineBoxData, isLoading: nineLoading } = useQuery({
    queryKey: ["exec-nine-box"],
    queryFn: () => fetchApi<NineBoxResponse>("/analytics/executive/nine-box/"),
  });

  const { data: mobilityData, isLoading: mobLoading } = useQuery({
    queryKey: ["exec-mobility-trends"],
    queryFn: () => fetchApi<MobilityTrendsResponse>("/analytics/executive/mobility-trends/"),
  });

  const isLoading = benchLoading || nineLoading || mobLoading;
  if (isLoading) return <LoadingState rows={8} />;

  // Transform mobility data for Recharts
  const mobilityChartData = (mobilityData?.periods || []).map((period, idx) => ({
    period,
    Promotions: mobilityData?.promotions[idx] || 0,
    LateralMoves: mobilityData?.lateral_moves[idx] || 0,
  }));

  // Build Nine-Box 3x3 lookup
  const gridMap: Record<string, { label: string; count: number; category: string }> = {};
  nineBoxData?.grid.forEach((item) => {
    gridMap[`${item.row}-${item.col}`] = item;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Readiness & Succession Planning</h1>
        <p className="text-sm text-slate-500 mt-1">
          Succession depth for critical roles, aggregated Nine-Box talent distribution, and internal mobility trends.
        </p>
      </div>

      {/* Small Group Privacy Banner */}
      <div className="p-3.5 rounded-lg bg-slate-100 border border-slate-200 text-xs text-slate-700 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Shield className="w-4 h-4 text-indigo-600 shrink-0" />
          <span>
            <strong>Succession Privacy Safeguard:</strong> Candidate counts fewer than 5 for critical roles are displayed as <em>&lt;5</em> with employee identities fully masked.
          </span>
        </div>
        <Badge variant="secondary" className="text-[10px] uppercase font-bold">
          Aggregates Only
        </Badge>
      </div>

      {/* Critical Roles Bench Strength Cards */}
      <Card>
        <CardHeader className="p-6 pb-3 border-b border-slate-100">
          <CardTitle className="text-base font-semibold text-slate-900 flex items-center space-x-2">
            <Briefcase className="w-4 h-4 text-indigo-600" />
            <span>Critical Position Bench Strength</span>
          </CardTitle>
          <CardDescription className="text-xs text-slate-500 mt-0.5">
            Succession depth and feeder pool readiness for tier-1 strategic roles
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {benchStrength?.map((role) => (
              <div
                key={role.role_id}
                className="p-5 rounded-xl border border-slate-200 bg-white shadow-xs space-y-4 text-xs"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-sm text-slate-900">{role.title}</h4>
                    <span className="text-[11px] text-slate-500">
                      {role.track} · Level {role.level}
                    </span>
                  </div>
                  <Badge
                    variant={
                      role.health === "STRONG"
                        ? "success"
                        : role.health === "ADEQUATE"
                        ? "secondary"
                        : "warning"
                    }
                    className="text-[10px] font-bold"
                  >
                    {role.health.replace(/_/g, " ")}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-2 text-center py-2 bg-slate-50 rounded-lg border border-slate-100">
                  <div className="p-2">
                    <span className="text-[10px] uppercase font-semibold text-emerald-700 block">Ready Now</span>
                    <span className="text-lg font-bold text-slate-900">{role.ready_count}</span>
                  </div>
                  <div className="p-2 border-l border-slate-200">
                    <span className="text-[10px] uppercase font-semibold text-amber-700 block">Near Ready</span>
                    <span className="text-lg font-bold text-slate-900">{role.near_ready_count}</span>
                  </div>
                </div>

                <div className="flex justify-between items-center text-[11px] text-slate-500 pt-1">
                  <span>Feeder Talent Pool:</span>
                  <span className="font-semibold text-slate-800">{role.feeder_headcount} employees</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 2-Column Section: Nine-Box Matrix & Internal Mobility Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Aggregated Nine-Box Grid */}
        <Card>
          <CardHeader className="p-6 pb-3 border-b border-slate-100">
            <CardTitle className="text-base font-semibold text-slate-900 flex items-center space-x-2">
              <Layers className="w-4 h-4 text-indigo-600" />
              <span>Nine-Box Talent Matrix (Aggregated)</span>
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 mt-0.5">
              Performance (X-axis) vs Potential (Y-axis) headcount density
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              {[3, 2, 1].map((row) =>
                [1, 2, 3].map((col) => {
                  const cell = gridMap[`${row}-${col}`];
                  const isTopRight = row === 3 && col === 3;
                  const isBottomLeft = row === 1 && col === 1;

                  return (
                    <div
                      key={`${row}-${col}`}
                      className={`p-3 rounded-lg border flex flex-col justify-between h-24 ${
                        isTopRight
                          ? "bg-emerald-50 border-emerald-200 text-emerald-950"
                          : isBottomLeft
                          ? "bg-rose-50/50 border-rose-200 text-rose-950"
                          : "bg-slate-50 border-slate-200 text-slate-900"
                      }`}
                    >
                      <span className="font-bold text-[11px] line-clamp-1">{cell?.label || "Cell"}</span>
                      <span className="text-2xl font-extrabold block my-auto">
                        {cell?.count ?? 0}
                      </span>
                      <span className="text-[9px] text-slate-500 block leading-tight truncate">
                        {cell?.category.split(",")[0] || ""}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
            <div className="flex justify-between items-center text-[10px] text-slate-400 mt-3 pt-2 border-t border-slate-100 uppercase tracking-wider">
              <span>Low Performance &rarr; High Performance</span>
              <span>Low Potential &uarr; High Potential</span>
            </div>
          </CardContent>
        </Card>

        {/* Internal Mobility Trends */}
        <Card>
          <CardHeader className="p-6 pb-3 border-b border-slate-100">
            <CardTitle className="text-base font-semibold text-slate-900 flex items-center space-x-2">
              <TrendingUp className="w-4 h-4 text-indigo-600" />
              <span>Internal Mobility Trajectory</span>
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 mt-0.5">
              Quarterly promotions and lateral department transfers
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={mobilityChartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="period" stroke="#94A3B8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #E2E8F0", fontSize: "12px" }} />
                  <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }} />
                  <Line type="monotone" dataKey="Promotions" stroke="#10B981" strokeWidth={2.5} dot={{ r: 5 }} />
                  <Line type="monotone" dataKey="LateralMoves" stroke="#4F46E5" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
