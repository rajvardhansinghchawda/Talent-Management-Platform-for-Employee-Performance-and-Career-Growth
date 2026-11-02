"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  User,
  ArrowLeft,
  Target,
  Award,
  TrendingUp,
  FileText,
  MessageSquare,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Clock,
  Briefcase,
  Flag,
} from "lucide-react";
import { api } from "@/lib/api/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { StatusChip } from "@/components/shared/StatusChip";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function TeamMemberDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const queryClient = useQueryClient();

  // Promotion flag state
  const [flagDialogOpen, setFlagDialogOpen] = useState(false);
  const [flagNote, setFlagNote] = useState("");
  const [flagSuccessMsg, setFlagSuccessMsg] = useState<string | null>(null);

  // Queries
  const { data: member, isLoading: memberLoading, error: memberError } = useQuery({
    queryKey: ["manager-team-member", id],
    queryFn: () => api.employees.get(id),
  });

  const { data: overviewData } = useQuery({
    queryKey: ["manager-team-overview", id],
    queryFn: () => api.manager.getTeamMemberOverview(id),
    enabled: !!id,
  });

  const { data: goalsData } = useQuery({
    queryKey: ["manager-team-goals", id],
    queryFn: () => api.manager.getGoals({ employee: id }),
    enabled: !!id,
  });

  const { data: reviewsData } = useQuery({
    queryKey: ["manager-team-reviews", id],
    queryFn: () => api.manager.getReviews({ employee: id }),
    enabled: !!id,
  });

  const { data: feedbackData } = useQuery({
    queryKey: ["manager-team-feedback", id],
    queryFn: () => api.manager.getFeedback({ to_employee: id }),
    enabled: !!id,
  });

  const { data: devPlansData } = useQuery({
    queryKey: ["manager-team-devplans", id],
    queryFn: () => api.manager.getDevelopmentPlans({ employee: id }),
    enabled: !!id,
  });

  // Flag Promotion Mutation
  const flagMutation = useMutation({
    mutationFn: (note: string) => api.manager.flagPromotion({ employee: id, note }),
    onSuccess: (res) => {
      setFlagDialogOpen(false);
      setFlagSuccessMsg(res.message);
      queryClient.invalidateQueries({ queryKey: ["manager-team-overview", id] });
    },
  });

  if (memberLoading) return <LoadingState rows={8} />;
  if (memberError || !member) {
    return <ErrorState message="Team member not found or outside your reporting line." />;
  }

  const goals = Array.isArray(goalsData) ? goalsData : ((goalsData as any)?.results || []);
  const reviews = Array.isArray(reviewsData) ? reviewsData : ((reviewsData as any)?.results || []);
  const feedbacks = Array.isArray(feedbackData) ? feedbackData : ((feedbackData as any)?.results || []);
  const devPlans = Array.isArray(devPlansData) ? devPlansData : ((devPlansData as any)?.results || []);
  const currentPlan = devPlans[0];

  return (
    <div className="space-y-6">
      {/* Back button */}
      <div>
        <Link href="/manager/team">
          <Button variant="ghost" size="sm" className="h-8 px-2 text-slate-500 hover:text-slate-900">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to My Team
          </Button>
        </Link>
      </div>

      {flagSuccessMsg && (
        <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-medium flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{flagSuccessMsg}</span>
        </div>
      )}

      {/* Header Profile Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 rounded-2xl bg-indigo-600 text-white font-bold text-xl flex items-center justify-center shadow-md">
                {member.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
              </div>
              <div className="space-y-1">
                <div className="flex items-center space-x-2.5">
                  <h1 className="text-xl font-bold text-slate-900">{member.name}</h1>
                  <StatusChip status={member.employment_status} />
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                  <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">
                    {member.employee_code}
                  </span>
                  <span>{member.job_role?.title || member.job_title || "Team Member"}</span>
                  <span>·</span>
                  <span>{member.department?.name || "Engineering"}</span>
                  <span>·</span>
                  <span>Reports to You</span>
                </div>
              </div>
            </div>

            <Button
              size="sm"
              onClick={() => setFlagDialogOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs"
            >
              <Flag className="w-3.5 h-3.5 mr-1.5" />
              Flag Ready for Promotion
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 7 Tabs Section */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="bg-slate-100 p-1 rounded-lg w-full justify-start overflow-x-auto">
          <TabsTrigger value="overview">1. Overview</TabsTrigger>
          <TabsTrigger value="goals">2. Goals</TabsTrigger>
          <TabsTrigger value="reviews">3. Reviews</TabsTrigger>
          <TabsTrigger value="skills">4. Skills</TabsTrigger>
          <TabsTrigger value="devplan">5. Development Plan</TabsTrigger>
          <TabsTrigger value="feedback">6. Feedback</TabsTrigger>
          <TabsTrigger value="career">7. Career Path</TabsTrigger>
        </TabsList>

        {/* TAB 1: Overview */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-xs font-semibold text-slate-500 uppercase">Current Goal Score</CardTitle>
                <CardTitle className="text-2xl font-bold text-indigo-600 mt-1">
                  {overviewData?.goal_score ? `${overviewData.goal_score}` : "0.8500"}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <span className="text-[11px] text-slate-500">85% weighted goal progress</span>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-xs font-semibold text-slate-500 uppercase">Latest Rating</CardTitle>
                <CardTitle className="text-2xl font-bold text-slate-900 mt-1">
                  {overviewData?.latest_rating ? `${overviewData.latest_rating} / 5.0` : "4.0 / 5.0"}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <span className="text-[11px] text-emerald-600 font-medium">Meets Expectations</span>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-xs font-semibold text-slate-500 uppercase">Readiness Status</CardTitle>
                <div className="mt-2">
                  <StatusChip status={overviewData?.readiness || "DEVELOPING"} />
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-1">
                <span className="text-[11px] text-slate-500">Target: Senior Backend Developer</span>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TAB 2: Goals */}
        <TabsContent value="goals">
          <Card>
            <CardHeader className="p-6 pb-4 border-b border-slate-100">
              <CardTitle className="text-base font-semibold text-slate-900">Goals & OKRs</CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Quarterly objectives, progress updates, and weighted scores
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              {goals.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center italic">No goals assigned.</p>
              ) : (
                <div className="space-y-3">
                  {goals.map((g: any) => (
                    <div key={g.id} className="p-3.5 rounded-lg border border-slate-200 bg-white space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-900">{g.title}</span>
                        <StatusChip status={g.status} />
                      </div>
                      <div className="flex justify-between text-[11px] text-slate-500">
                        <span>Weight: {g.weight}%</span>
                        <span className="font-semibold text-indigo-600">{g.progress_pct}% complete</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full bg-indigo-600 rounded-full"
                          style={{ width: `${g.progress_pct}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: Reviews */}
        <TabsContent value="reviews">
          <Card>
            <CardHeader className="p-6 pb-4 border-b border-slate-100">
              <CardTitle className="text-base font-semibold text-slate-900">Performance Reviews</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {reviews.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center italic">No review records available.</p>
              ) : (
                <div className="space-y-3">
                  {reviews.map((r: any) => (
                    <div key={r.id} className="p-3.5 rounded-lg border border-slate-200 bg-white flex justify-between items-center text-xs">
                      <div>
                        <span className="font-bold text-slate-900 block">{r.cycle?.name || "Annual Cycle"}</span>
                        <span className="text-[11px] text-slate-500">Status: {r.status}</span>
                      </div>
                      <StatusChip status={r.status} />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 4: Skills */}
        <TabsContent value="skills">
          <Card>
            <CardHeader className="p-6 pb-4 border-b border-slate-100">
              <CardTitle className="text-base font-semibold text-slate-900">Competencies & Validation Status</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Skill Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Validated Level</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-semibold text-xs text-slate-900">Python & Django</TableCell>
                    <TableCell className="text-xs text-slate-500">Backend</TableCell>
                    <TableCell className="text-xs font-bold text-indigo-600">Level 3 (Proficient)</TableCell>
                    <TableCell><StatusChip status="VALIDATED" /></TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-semibold text-xs text-slate-900">System Design</TableCell>
                    <TableCell className="text-xs text-slate-500">Architecture</TableCell>
                    <TableCell className="text-xs font-bold text-amber-600">Level 2 (Working)</TableCell>
                    <TableCell><StatusChip status="PENDING" /></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 5: Development Plan */}
        <TabsContent value="devplan">
          <Card>
            <CardHeader className="p-6 pb-4 border-b border-slate-100">
              <CardTitle className="text-base font-semibold text-slate-900">Active Development Plan</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {currentPlan ? (
                <div className="space-y-4">
                  <div className="flex justify-between items-center text-xs pb-3 border-b border-slate-100">
                    <div>
                      <span className="font-bold text-slate-900 block">Target: {currentPlan.target_role_title}</span>
                      <span className="text-slate-500 text-[11px]">{currentPlan.items?.length || 0} action items</span>
                    </div>
                    <StatusChip status={currentPlan.status} />
                  </div>
                  <div className="space-y-2">
                    {currentPlan.items?.map((item: any) => (
                      <div key={item.id} className="p-2.5 rounded bg-slate-50 border border-slate-100 flex justify-between items-center text-xs">
                        <span className="font-medium text-slate-800">{item.title}</span>
                        <Badge variant="outline" className="text-[10px]">{item.status}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-400 py-4 text-center italic">No active development plan.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 6: Feedback */}
        <TabsContent value="feedback">
          <Card>
            <CardHeader className="p-6 pb-4 border-b border-slate-100">
              <CardTitle className="text-base font-semibold text-slate-900">Feedback History</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {feedbacks.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center italic">No feedback entries found.</p>
              ) : (
                <div className="space-y-3">
                  {feedbacks.map((f: any) => (
                    <div key={f.id} className="p-3.5 rounded-lg border border-slate-200 bg-white space-y-1.5 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-slate-900">{f.from_name || "Manager"}</span>
                        <Badge variant="outline" className="text-[10px]">{f.visibility_label}</Badge>
                      </div>
                      <p className="text-slate-700">{f.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 7: Career */}
        <TabsContent value="career">
          <Card>
            <CardHeader className="p-6 pb-4 border-b border-slate-100">
              <CardTitle className="text-base font-semibold text-slate-900">Career Progression Pathway</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="p-4 rounded-lg bg-indigo-50/50 border border-indigo-100 text-xs">
                <span className="font-semibold text-indigo-900 block">Current Ladder Position:</span>
                <span className="text-sm font-bold text-slate-900 block mt-0.5">Junior Software Engineer (L1)</span>
                <span className="text-slate-500 text-[11px] mt-1 block">Target Promotion Role: Senior Backend Developer (L3)</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Flag Promotion Modal */}
      {flagDialogOpen && (
        <Dialog open={flagDialogOpen} onOpenChange={setFlagDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Flag {member.name} Ready for Promotion?</DialogTitle>
              <DialogDescription>
                Sends an official recommendation notification to HR Administration. No role or salary change occurs automatically.
              </DialogDescription>
            </DialogHeader>

            <div className="py-2 space-y-2 text-xs">
              <label className="font-semibold text-slate-700 block">Manager Justification Note *</label>
              <textarea
                placeholder="Detail key accomplishments, benchmark gap closures, and readiness rationale..."
                rows={4}
                value={flagNote}
                onChange={(e) => setFlagNote(e.target.value)}
                className="w-full p-2.5 rounded-md border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                required
              />
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setFlagDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                disabled={!flagNote.trim() || flagMutation.isPending}
                onClick={() => flagMutation.mutate(flagNote)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                {flagMutation.isPending ? "Sending..." : "Submit Recommendation"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
