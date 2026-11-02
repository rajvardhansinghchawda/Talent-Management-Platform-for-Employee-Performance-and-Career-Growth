"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  MessageSquare,
  Plus,
  Award,
  Lock,
  Eye,
  Send,
  User,
  CheckCircle2,
} from "lucide-react";
import { api } from "@/lib/api/client";
import type { FeedbackItem, ManagerTeamRosterItem } from "@/lib/api/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import { formatDateTime } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function TeamFeedbackPage() {
  const queryClient = useQueryClient();

  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [selectedEmpId, setSelectedEmpId] = useState("");
  const [feedbackType, setFeedbackType] = useState("STRENGTHS");
  const [visibility, setVisibility] = useState("EMPLOYEE_VISIBLE");
  const [content, setContent] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  // Queries
  const { data: teamRoster } = useQuery({
    queryKey: ["manager-team"],
    queryFn: () => api.manager.getTeam(),
  });

  const { data: feedbackData, isLoading, error, refetch } = useQuery({
    queryKey: ["manager-feedback-list"],
    queryFn: () => api.manager.getFeedback({ scope: "team" }),
  });

  const { data: visibilityOptions } = useQuery({
    queryKey: ["feedback-visibility-options"],
    queryFn: () => api.manager.getFeedbackVisibilityOptions(),
  });

  // Give Feedback Mutation
  const giveFeedbackMutation = useMutation({
    mutationFn: (data: any) => api.manager.giveFeedback(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manager-feedback-list"] });
      setFeedbackOpen(false);
      setSelectedEmpId("");
      setContent("");
      setFormError(null);
    },
    onError: (err: any) => {
      setFormError(err.message || "Failed to submit feedback.");
    },
  });

  const roster: ManagerTeamRosterItem[] = Array.isArray(teamRoster) ? teamRoster : [];
  const feedbackList: FeedbackItem[] = Array.isArray(feedbackData) ? feedbackData : [];
  const visOpts = visibilityOptions || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Team Feedback & Recognition</h1>
          <p className="text-sm text-slate-500 mt-1">
            Continuous praise, constructive growth guidance, and confidential manager coaching observations.
          </p>
        </div>
        <Button onClick={() => setFeedbackOpen(true)} size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white">
          <Plus className="w-4 h-4 mr-1.5" />
          Give Feedback
        </Button>
      </div>

      {/* Feedback Feed */}
      {isLoading ? (
        <LoadingState rows={5} />
      ) : error ? (
        <ErrorState message="Failed to load team feedback." onRetry={() => refetch()} />
      ) : feedbackList.length === 0 ? (
        <EmptyState
          title="No feedback records yet"
          description="Continuous feedback helps team members improve and provides documented evidence for review cycles."
          actionLabel="Give Feedback"
          onAction={() => setFeedbackOpen(true)}
        />
      ) : (
        <div className="space-y-4">
          {feedbackList.map((item) => (
            <Card key={item.id} className="hover:border-slate-300 transition-colors">
              <CardContent className="p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-700 font-bold flex items-center justify-center text-xs">
                      {item.to_name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                    </div>
                    <div>
                      <span className="font-bold text-slate-900 text-xs">To: {item.to_name}</span>
                      <span className="text-[11px] text-slate-500 block">
                        From: {item.from_name || "You"} · {formatDateTime(item.created_at)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline" className="text-[10px] uppercase font-mono">
                      {item.feedback_type}
                    </Badge>
                    <Badge
                      variant={item.visibility === "PRIVATE_TO_MANAGER" ? "destructive" : "secondary"}
                      className="text-[10px]"
                    >
                      {item.visibility === "PRIVATE_TO_MANAGER" ? <Lock className="w-2.5 h-2.5 mr-1" /> : null}
                      {item.visibility_label}
                    </Badge>
                  </div>
                </div>
                <p className="text-xs text-slate-700 mt-3 leading-relaxed whitespace-pre-wrap">
                  {item.content}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Give Feedback Modal */}
      <Dialog open={feedbackOpen} onOpenChange={setFeedbackOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Give Team Feedback</DialogTitle>
            <DialogDescription>
              Share encouragement or private coaching notes. Permissions are enforced based on visibility choice.
            </DialogDescription>
          </DialogHeader>

          {formError && (
            <div className="p-2.5 rounded bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
              {formError}
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              giveFeedbackMutation.mutate({
                to_employee: selectedEmpId,
                feedback_type: feedbackType,
                visibility,
                content,
              });
            }}
            className="space-y-4 py-2 text-xs"
          >
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700 block">Select Team Member *</label>
              <select
                value={selectedEmpId}
                onChange={(e) => setSelectedEmpId(e.target.value)}
                className="w-full h-9 px-3 rounded-md border border-slate-300 bg-white text-xs text-slate-800"
                required
              >
                <option value="">Choose an employee...</option>
                {roster.map((m) => (
                  <option key={m.employee.id} value={m.employee.id}>
                    {m.employee.name} ({m.role})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700 block">Feedback Theme</label>
                <select
                  value={feedbackType}
                  onChange={(e) => setFeedbackType(e.target.value)}
                  className="w-full h-9 px-3 rounded-md border border-slate-300 bg-white text-xs text-slate-800"
                >
                  <option value="STRENGTHS">Strengths & Praise</option>
                  <option value="AREAS_FOR_GROWTH">Areas for Growth</option>
                  <option value="GENERAL">General Coaching</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700 block">Visibility Setting *</label>
                <select
                  value={visibility}
                  onChange={(e) => setVisibility(e.target.value)}
                  className="w-full h-9 px-3 rounded-md border border-slate-300 bg-white text-xs text-slate-800"
                >
                  <option value="EMPLOYEE_VISIBLE">Visible to Employee</option>
                  <option value="PRIVATE_TO_MANAGER">Private to Manager & HR</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700 block">Feedback Content *</label>
              <textarea
                rows={4}
                placeholder="Be specific, actionable, and reference concrete observations..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full p-2.5 rounded-md border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                required
              />
            </div>

            <DialogFooter className="pt-2">
              <Button variant="outline" type="button" onClick={() => setFeedbackOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!selectedEmpId || !content.trim() || giveFeedbackMutation.isPending}
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                {giveFeedbackMutation.isPending ? "Sending..." : "Send Feedback"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
