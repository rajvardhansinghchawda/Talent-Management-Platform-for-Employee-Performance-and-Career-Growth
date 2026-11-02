"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Target, ArrowLeft, Send, Save } from "lucide-react";
import { api, fetchApi } from "@/lib/api/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function CreateGoalPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [goalType, setGoalType] = useState("KPI");
  const [metricUnit, setMetricUnit] = useState("%");
  const [startValue, setStartValue] = useState("0");
  const [targetValue, setTargetValue] = useState("100");
  const [direction, setDirection] = useState("HIGHER_BETTER");
  const [weight, setWeight] = useState("25");
  const [dueDate, setDueDate] = useState("");
  const [cycleId, setCycleId] = useState("");
  const [parentId, setParentId] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  // Queries for selectors
  const { data: cycles } = useQuery({
    queryKey: ["review-cycles"],
    queryFn: () => api.reviewCycles.list(),
  });

  const { data: parentGoals } = useQuery({
    queryKey: ["parent-goals"],
    queryFn: () => fetchApi<any[]>("/goals/?status=ACTIVE"),
  });

  const saveMutation = useMutation({
    mutationFn: async (submitForApproval: boolean) => {
      const payload = {
        title,
        description,
        goal_type: goalType,
        metric_unit: metricUnit,
        start_value: Number(startValue),
        target_value: Number(targetValue),
        direction,
        weight: Number(weight),
        due_date: dueDate || undefined,
        cycle: cycleId || undefined,
        parent: parentId || undefined,
      };

      const goal = await fetchApi<{ id: string }>("/goals/", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (submitForApproval) {
        await fetchApi(`/goals/${goal.id}/submit/`, { method: "POST" });
      }
      return goal;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee-goals"] });
      queryClient.invalidateQueries({ queryKey: ["employee-dashboard"] });
      router.push("/employee/goals");
    },
    onError: (err: any) => {
      setFormError(err.message || "Failed to create goal.");
    },
  });

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <Link href="/employee/goals">
          <Button variant="ghost" size="sm" className="h-8 px-2 text-slate-500 hover:text-slate-900">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Goals
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Create a Goal</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Define a quarterly deliverable, target metric, and organizational alignment.
          </p>
        </div>
      </div>

      {formError && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
          {formError}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          saveMutation.mutate(true); // default submit for approval
        }}
        className="space-y-6"
      >
        <Card>
          <CardHeader className="p-6 pb-4 border-b border-slate-100">
            <CardTitle className="text-base font-semibold text-slate-900">Goal Definition & Metrics</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Goal Title *</label>
              <Input
                placeholder="e.g. Implement Real-Time Telemetry Pipeline for Analytics"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Description</label>
              <textarea
                rows={3}
                placeholder="Explain the background, key objectives, and measurable milestones..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-md border border-slate-300 p-3 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Goal Type *</label>
                <select
                  value={goalType}
                  onChange={(e) => setGoalType(e.target.value)}
                  className="w-full h-9 px-3 rounded-md border border-slate-300 bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                >
                  <option value="KPI">KPI Target</option>
                  <option value="OKR">OKR Milestone</option>
                  <option value="DEVELOPMENTAL">Developmental Skill</option>
                  <option value="COMPANY">Company Strategic</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Improvement Direction *</label>
                <select
                  value={direction}
                  onChange={(e) => setDirection(e.target.value)}
                  className="w-full h-9 px-3 rounded-md border border-slate-300 bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                >
                  <option value="HIGHER_BETTER">Higher is Better (Increase)</option>
                  <option value="LOWER_BETTER">Lower is Better (Decrease)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Weight (%) *</label>
                <Input
                  type="number"
                  min="5"
                  max="100"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Start Value</label>
                <Input
                  type="number"
                  value={startValue}
                  onChange={(e) => setStartValue(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Target Value *</label>
                <Input
                  type="number"
                  value={targetValue}
                  onChange={(e) => setTargetValue(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Metric Unit</label>
                <Input
                  placeholder="e.g. %, count, hours"
                  value={metricUnit}
                  onChange={(e) => setMetricUnit(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Review Cycle</label>
                <select
                  value={cycleId}
                  onChange={(e) => setCycleId(e.target.value)}
                  className="w-full h-9 px-3 rounded-md border border-slate-300 bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                >
                  <option value="">Select cycle...</option>
                  {cycles?.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Parent Goal Alignment</label>
                <select
                  value={parentId}
                  onChange={(e) => setParentId(e.target.value)}
                  className="w-full h-9 px-3 rounded-md border border-slate-300 bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                >
                  <option value="">None (Top-Level Goal)</option>
                  {(Array.isArray(parentGoals) ? parentGoals : []).map((pg: any) => (
                    <option key={pg.id} value={pg.id}>
                      {pg.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Due Date</label>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bottom Actions */}
        <div className="flex items-center justify-end space-x-3">
          <Button
            type="button"
            variant="outline"
            disabled={saveMutation.isPending}
            onClick={() => saveMutation.mutate(false)}
          >
            <Save className="w-3.5 h-3.5 mr-1.5" />
            Save as Draft
          </Button>
          <Button
            type="submit"
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
            disabled={saveMutation.isPending}
          >
            <Send className="w-3.5 h-3.5 mr-1.5" />
            {saveMutation.isPending ? "Submitting..." : "Submit for Approval"}
          </Button>
        </div>
      </form>
    </div>
  );
}
