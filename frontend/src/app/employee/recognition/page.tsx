"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Sparkles, Plus, Award, Heart, MessageSquare, Send } from "lucide-react";
import { api, fetchApi } from "@/lib/api/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { formatDate } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface RecognitionItem {
  id: string;
  badge: {
    id: string;
    name: string;
    icon?: string;
  };
  from: {
    name: string;
  };
  to: {
    name: string;
  };
  message: string;
  created_at: string;
}

export default function RecognitionPage() {
  const queryClient = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [toEmployeeId, setToEmployeeId] = useState("");
  const [badgeName, setBadgeName] = useState("Technical Excellence");
  const [message, setMessage] = useState("");

  // Queries
  const { data: myBadges, isLoading: myLoading } = useQuery({
    queryKey: ["my-recognitions"],
    queryFn: () => fetchApi<RecognitionItem[]>("/recognitions/?scope=received"),
  });

  const { data: wallFeed, isLoading: wallLoading } = useQuery({
    queryKey: ["recognition-wall"],
    queryFn: () => fetchApi<RecognitionItem[]>("/recognitions/?scope=wall"),
  });

  const { data: colleagues } = useQuery({
    queryKey: ["colleagues-directory"],
    queryFn: () => api.employees.list({ status: "ACTIVE" }),
  });

  const giveMutation = useMutation({
    mutationFn: () =>
      fetchApi("/recognitions/", {
        method: "POST",
        body: JSON.stringify({
          to_employee: toEmployeeId,
          badge_name: badgeName,
          message,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recognition-wall"] });
      queryClient.invalidateQueries({ queryKey: ["my-recognitions"] });
      setDialogOpen(false);
      setToEmployeeId("");
      setMessage("");
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Recognition & Kudos</h1>
          <p className="text-sm text-slate-500 mt-1">
            Celebrate peer achievements, cross-functional collaboration, and outstanding contributions.
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)} size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white">
          <Sparkles className="w-4 h-4 mr-1.5" />
          Give Recognition
        </Button>
      </div>

      {/* Received Badges Section */}
      <Card className="border-indigo-100 bg-gradient-to-r from-indigo-50/20 to-white">
        <CardHeader className="p-6 pb-2">
          <CardTitle className="text-base font-bold text-slate-900 flex items-center space-x-2">
            <Award className="w-5 h-5 text-indigo-600" />
            <span>My Awarded Badges</span>
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            Recognitions received from your team members and engineering leaders
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          {myLoading ? (
            <LoadingState rows={2} />
          ) : !myBadges || myBadges.length === 0 ? (
            <p className="text-xs text-slate-400 py-3 text-center">No badges awarded yet.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {myBadges.map((b) => (
                <div key={b.id} className="p-4 rounded-xl bg-white border border-indigo-100 shadow-xs flex items-start space-x-3 text-xs">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                    <Award className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <span className="font-bold text-slate-900 block">{b.badge.name}</span>
                    <span className="text-[11px] text-slate-500 block">From {b.from.name} · {formatDate(b.created_at)}</span>
                    <p className="text-slate-700 text-[11px] pt-1 leading-snug">{b.message}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recognition Wall Feed */}
      <Card>
        <CardHeader className="p-6 pb-3 border-b border-slate-100">
          <CardTitle className="text-base font-semibold text-slate-900">Organization Kudos Wall</CardTitle>
          <CardDescription className="text-xs text-slate-500 mt-0.5">
            Public recognitions celebrated across all teams and departments
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          {wallLoading ? (
            <LoadingState rows={4} />
          ) : !wallFeed || wallFeed.length === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center">No kudos shared yet.</p>
          ) : (
            <div className="space-y-4">
              {wallFeed.map((post) => (
                <div key={post.id} className="p-4 rounded-lg bg-slate-50/50 border border-slate-200 flex items-start space-x-3 text-xs">
                  <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center shrink-0">
                    {post.from.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center space-x-2">
                      <strong className="text-slate-900">{post.from.name}</strong>
                      <span className="text-slate-400">recognized</span>
                      <strong className="text-indigo-600">{post.to.name}</strong>
                      <Badge variant="default" className="text-[10px] ml-auto">
                        {post.badge.name}
                      </Badge>
                    </div>
                    <p className="text-slate-700 text-xs leading-relaxed pt-1">{post.message}</p>
                    <span className="text-[10px] text-slate-400 block pt-1">{formatDate(post.created_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Give Recognition Modal */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Give Peer Recognition</DialogTitle>
            <DialogDescription>
              Celebrate a colleague&apos;s effort, support, or outstanding deliverable.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700 block">Select Colleague *</label>
              <select
                value={toEmployeeId}
                onChange={(e) => setToEmployeeId(e.target.value)}
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
              <label className="font-semibold text-slate-700 block">Select Badge *</label>
              <select
                value={badgeName}
                onChange={(e) => setBadgeName(e.target.value)}
                className="w-full h-9 px-3 rounded-md border border-slate-300 bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600"
              >
                <option value="Technical Excellence">Technical Excellence</option>
                <option value="Team Player">Team Player & Support</option>
                <option value="Fast Learner">Fast Learner & Innovator</option>
                <option value="Customer Obsessed">Customer Obsessed</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700 block">Kudos Message *</label>
              <textarea
                rows={3}
                placeholder="Share specific praise on what made their contribution exceptional..."
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
              disabled={!toEmployeeId || !message.trim() || giveMutation.isPending}
              onClick={() => giveMutation.mutate()}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              <Send className="w-3.5 h-3.5 mr-1.5" />
              {giveMutation.isPending ? "Sending..." : "Send Kudos"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
