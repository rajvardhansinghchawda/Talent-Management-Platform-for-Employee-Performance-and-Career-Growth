"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Calendar,
  Plus,
  Clock,
  Lock,
  CheckCircle2,
  Circle,
  Save,
  User,
  Users,
} from "lucide-react";
import { api } from "@/lib/api/client";
import type { OneOnOneItem, ManagerTeamRosterItem } from "@/lib/api/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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

export default function OneOnOnesPage() {
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<"upcoming" | "past">("upcoming");
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(null);

  // Notes state
  const [sharedNotes, setSharedNotes] = useState("");
  const [privateNotes, setPrivateNotes] = useState("");
  const [newActionItemTitle, setNewActionItemTitle] = useState("");

  // Schedule modal state
  const [scheduleEmpId, setScheduleEmpId] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [scheduleShared, setScheduleShared] = useState("");

  // Queries
  const { data: teamRoster } = useQuery({
    queryKey: ["manager-team"],
    queryFn: () => api.manager.getTeam(),
  });

  const { data: meetingsData, isLoading, error, refetch } = useQuery({
    queryKey: ["manager-one-on-ones", activeTab],
    queryFn: () => api.manager.getOneOnOnes({ scope: "team", when: activeTab }),
  });

  const meetings: OneOnOneItem[] = Array.isArray(meetingsData) ? meetingsData : [];
  const selectedMeeting = meetings.find((m) => m.id === selectedMeetingId) || meetings[0];

  React.useEffect(() => {
    if (selectedMeeting) {
      setSharedNotes(selectedMeeting.shared_notes || "");
      setPrivateNotes(selectedMeeting.private_notes || "");
    }
  }, [selectedMeeting?.id]);

  // Mutations
  const updateNotesMutation = useMutation({
    mutationFn: () =>
      api.manager.updateNotes(selectedMeeting.id, {
        shared_notes: sharedNotes,
        private_notes: privateNotes,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manager-one-on-ones"] });
    },
  });

  const addActionItemMutation = useMutation({
    mutationFn: (title: string) =>
      api.manager.addActionItem(selectedMeeting.id, { title }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manager-one-on-ones"] });
      setNewActionItemTitle("");
    },
  });

  const scheduleMutation = useMutation({
    mutationFn: (data: any) => api.manager.scheduleOneOnOne(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manager-one-on-ones"] });
      setScheduleOpen(false);
      setScheduleEmpId("");
      setScheduleTime("");
      setScheduleShared("");
    },
  });

  const roster: ManagerTeamRosterItem[] = Array.isArray(teamRoster) ? teamRoster : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">1:1 Meetings & Coaching</h1>
          <p className="text-sm text-slate-500 mt-1">
            Dedicated check-in agenda, collaborative shared notes, private manager observations, and action items.
          </p>
        </div>
        <Button onClick={() => setScheduleOpen(true)} size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white">
          <Plus className="w-4 h-4 mr-1.5" />
          Schedule 1:1
        </Button>
      </div>

      {/* Main Grid: Left List + Right Detail Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Meetings List */}
        <div className="space-y-4">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
            <TabsList className="w-full grid grid-cols-2 bg-slate-100 p-1">
              <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
              <TabsTrigger value="past">Past History</TabsTrigger>
            </TabsList>
          </Tabs>

          {isLoading ? (
            <LoadingState rows={4} />
          ) : error ? (
            <ErrorState message="Failed to load meetings." onRetry={() => refetch()} />
          ) : meetings.length === 0 ? (
            <Card className="p-6 text-center text-xs text-slate-400">
              No {activeTab} 1:1 meetings scheduled.
            </Card>
          ) : (
            <div className="space-y-2.5">
              {meetings.map((m) => {
                const isSelected = selectedMeeting?.id === m.id;
                return (
                  <Card
                    key={m.id}
                    onClick={() => setSelectedMeetingId(m.id)}
                    className={`p-3.5 cursor-pointer transition-all ${
                      isSelected
                        ? "border-indigo-600 bg-indigo-50/30 shadow-xs"
                        : "hover:border-slate-300 bg-white"
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-900">{m.employee_name}</span>
                      <Badge variant="outline" className="text-[10px] font-mono">
                        {m.status}
                      </Badge>
                    </div>
                    <span className="text-[11px] text-slate-500 mt-1 flex items-center">
                      <Clock className="w-3 h-3 mr-1 text-slate-400" />
                      {m.scheduled_at ? formatDateTime(m.scheduled_at) : "TBD"}
                    </span>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Meeting Workspace */}
        <div className="lg:col-span-2">
          {selectedMeeting ? (
            <Card>
              <CardHeader className="p-4 sm:p-6 pb-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base font-bold text-slate-900">
                    1:1 Workspace · {selectedMeeting.employee_name}
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500 mt-0.5">
                    Scheduled: {formatDateTime(selectedMeeting.scheduled_at)}
                  </CardDescription>
                </div>
                <Button
                  size="sm"
                  onClick={() => updateNotesMutation.mutate()}
                  disabled={updateNotesMutation.isPending}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs"
                >
                  <Save className="w-3.5 h-3.5 mr-1" />
                  {updateNotesMutation.isPending ? "Saving..." : "Save Notes"}
                </Button>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {/* 1. Shared Notes Editor */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-slate-900">Shared Agenda & Meeting Notes</label>
                    <span className="text-[10px] text-slate-400">Visible to you and {selectedMeeting.employee_name}</span>
                  </div>
                  <textarea
                    rows={4}
                    placeholder="Shared discussion topics, sprint blockers, project achievements..."
                    value={sharedNotes}
                    onChange={(e) => setSharedNotes(e.target.value)}
                    className="w-full p-3 rounded-lg border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>

                {/* 2. Distinct Private Notes Panel (per §5.10) */}
                <div className="p-4 rounded-xl border border-amber-300 bg-amber-50/30 space-y-2">
                  <div className="flex items-center space-x-2 text-amber-900">
                    <Lock className="w-3.5 h-3.5 text-amber-700" />
                    <span className="text-xs font-bold uppercase tracking-wider">
                      Private Manager Notes — Only you can see this
                    </span>
                  </div>
                  <p className="text-[11px] text-amber-700/80">
                    Confidential thoughts on compensation, readiness observations, and leadership dynamics. Never displayed to the employee.
                  </p>
                  <textarea
                    rows={3}
                    placeholder="Private coaching notes and tenure observations..."
                    value={privateNotes}
                    onChange={(e) => setPrivateNotes(e.target.value)}
                    className="w-full p-2.5 rounded-md border border-amber-200 bg-white text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                {/* 3. Action Items Tracker */}
                <div className="space-y-3 pt-2">
                  <h4 className="text-xs font-bold text-slate-900">Action Items & Deliverables</h4>
                  <div className="space-y-2">
                    {selectedMeeting.action_items?.map((item) => (
                      <div
                        key={item.id}
                        className="p-2.5 rounded-lg border border-slate-100 bg-slate-50 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center space-x-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          <span className="font-medium text-slate-800">{item.title}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">Owner: {item.owner_name}</span>
                      </div>
                    ))}
                  </div>

                  {/* Add action item input */}
                  <div className="flex items-center space-x-2 pt-2">
                    <Input
                      placeholder="Add an action item..."
                      value={newActionItemTitle}
                      onChange={(e) => setNewActionItemTitle(e.target.value)}
                      className="text-xs h-8"
                    />
                    <Button
                      size="sm"
                      disabled={!newActionItemTitle.trim() || addActionItemMutation.isPending}
                      onClick={() => addActionItemMutation.mutate(newActionItemTitle)}
                      className="h-8 text-xs shrink-0"
                    >
                      Add Item
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="p-12 text-center text-xs text-slate-400">
              Select a meeting from the list to view its agenda and notes.
            </Card>
          )}
        </div>
      </div>

      {/* Schedule 1:1 Modal */}
      <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule 1:1 Meeting</DialogTitle>
            <DialogDescription>
              Create a check-in with a direct report. A calendar invite notification will be sent.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              scheduleMutation.mutate({
                employee: scheduleEmpId,
                scheduled_at: scheduleTime,
                shared_notes: scheduleShared,
              });
            }}
            className="space-y-4 py-2 text-xs"
          >
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700 block">Select Team Member *</label>
              <select
                value={scheduleEmpId}
                onChange={(e) => setScheduleEmpId(e.target.value)}
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

            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700 block">Date and Time *</label>
              <Input
                type="datetime-local"
                value={scheduleTime}
                onChange={(e) => setScheduleTime(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700 block">Initial Shared Agenda</label>
              <textarea
                rows={2}
                placeholder="Topics to cover..."
                value={scheduleShared}
                onChange={(e) => setScheduleShared(e.target.value)}
                className="w-full p-2.5 rounded-md border border-slate-300 text-xs text-slate-900"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button variant="outline" type="button" onClick={() => setScheduleOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!scheduleEmpId || !scheduleTime || scheduleMutation.isPending}
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                {scheduleMutation.isPending ? "Scheduling..." : "Schedule Meeting"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
