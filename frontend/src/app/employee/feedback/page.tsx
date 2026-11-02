"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MessageSquare, Plus, Send, User, Calendar, Filter } from "lucide-react";
import { api, fetchApi } from "@/lib/api/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import { formatDate } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface FeedbackItem {
  id: string;
  type: string;
  author: string;
  content: string;
  created_at: string;
}

export default function EmployeeFeedbackPage() {
  const queryClient = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [recipientId, setRecipientId] = useState("");
  const [message, setMessage] = useState("");

  const { data: feedbacks, isLoading, error, refetch } = useQuery({
    queryKey: ["employee-feedbacks"],
    queryFn: () => fetchApi<FeedbackItem[]>("/feedback/"),
  });

  const { data: colleagues } = useQuery({
    queryKey: ["colleagues-list"],
    queryFn: () => api.employees.list({ status: "ACTIVE" }),
  });

  const requestMutation = useMutation({
    mutationFn: () =>
      fetchApi("/feedback-requests/", {
        method: "POST",
        body: JSON.stringify({
          requested_from: recipientId,
          message,
        }),
      }),
    onSuccess: () => {
      setDialogOpen(false);
      setRecipientId("");
      setMessage("");
    },
  });

  if (isLoading) return <LoadingState rows={4} />;
  if (error) {
    return (
      <ErrorState
        message={error instanceof Error ? error.message : "Failed to load feedback."}
        onRetry={() => refetch()}
      />
    );
  }

  const feedbackList: FeedbackItem[] = Array.isArray(feedbacks) ? feedbacks : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Feedback Center</h1>
          <p className="text-sm text-slate-500 mt-1">
            Continuous feedback received from managers and peers to foster growth and excellence.
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)} size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white">
          <Plus className="w-4 h-4 mr-1.5" />
          Request Feedback
        </Button>
      </div>

      {feedbackList.length === 0 ? (
        <EmptyState
          title="No feedback received"
          description="Ask colleagues or your manager for constructive observations on recent deliverables."
          actionLabel="Request Feedback"
          onAction={() => setDialogOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {feedbackList.map((f) => (
            <Card key={f.id} className="border-slate-200">
              <CardHeader className="p-6 pb-2 flex flex-row items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-xs">
                    {f.author.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                  </div>
                  <div>
                    <span className="font-semibold text-xs text-slate-900 block">{f.author}</span>
                    <span className="text-[11px] text-slate-400">{formatDate(f.created_at)}</span>
                  </div>
                </div>
                <Badge variant="secondary" className="text-[10px] capitalize">
                  {f.type.toLowerCase().replace(/_/g, " ")}
                </Badge>
              </CardHeader>
              <CardContent className="p-6 pt-2 text-xs">
                <p className="text-slate-700 leading-relaxed bg-slate-50/50 p-3 rounded-lg border border-slate-100">
                  {f.content}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Request Modal */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Peer or Manager Feedback</DialogTitle>
            <DialogDescription>
              Select a colleague or lead to request observations on a project or deliverable.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700 block">Select Colleague *</label>
              <select
                value={recipientId}
                onChange={(e) => setRecipientId(e.target.value)}
                className="w-full h-9 px-3 rounded-md border border-slate-300 bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600"
              >
                <option value="">Choose colleague...</option>
                {colleagues &&
                  (Array.isArray(colleagues) ? colleagues : (colleagues as any).results || []).map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.job_title || c.employee_code})
                    </option>
                  ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700 block">Note / Specific Areas</label>
              <textarea
                rows={3}
                placeholder="e.g. Could you share feedback on the recent Goals API integration and code review comments?"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full rounded-md border border-slate-300 p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!recipientId || requestMutation.isPending}
              onClick={() => requestMutation.mutate()}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              <Send className="w-3.5 h-3.5 mr-1.5" />
              {requestMutation.isPending ? "Sending..." : "Send Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
