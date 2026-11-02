"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  ArrowRight,
  Send,
  Star,
  FileCheck,
  AlertTriangle,
  Award,
  TrendingUp,
} from "lucide-react";
import { fetchApi } from "@/lib/api/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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

export default function ReviewDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const queryClient = useQueryClient();

  // Wizard step: 1 = Goals, 2 = Competencies, 3 = Overall Rating, 4 = Submit
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Self assessment state
  const [overallRating, setOverallRating] = useState<number>(4);
  const [selfComments, setSelfComments] = useState("");
  const [competencyRatings, setCompetencyRatings] = useState<Record<string, number>>({
    "Technical Architecture": 4,
    "Code Quality & Testing": 4,
    "Delivery & Ownership": 5,
    "Team Collaboration": 4,
  });

  const [disputeOpen, setDisputeOpen] = useState(false);
  const [disputeReason, setDisputeReason] = useState("");

  // Query review detail
  const { data: review, isLoading, error, refetch } = useQuery({
    queryKey: ["review-detail", id],
    queryFn: () => fetchApi<any>(`/reviews/${id}/`),
  });

  // Query goals snapshot
  const { data: goals } = useQuery({
    queryKey: ["employee-goals-snapshot"],
    queryFn: () => fetchApi<any[]>("/goals/?employee=me"),
  });

  // Submit Self-Assessment Mutation
  const submitMutation = useMutation({
    mutationFn: () =>
      fetchApi(`/reviews/${id}/self-assessment/`, {
        method: "POST",
        body: JSON.stringify({
          self_rating: overallRating,
          self_comments: selfComments,
          competencies: competencyRatings,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["review-detail", id] });
      queryClient.invalidateQueries({ queryKey: ["employee-reviews"] });
      queryClient.invalidateQueries({ queryKey: ["employee-dashboard"] });
      router.push("/employee/reviews");
    },
  });

  // Acknowledge Mutation
  const acknowledgeMutation = useMutation({
    mutationFn: () => fetchApi(`/reviews/${id}/acknowledge/`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["review-detail", id] });
    },
  });

  // Dispute Mutation
  const disputeMutation = useMutation({
    mutationFn: (reason: string) =>
      fetchApi(`/reviews/${id}/dispute/`, {
        method: "POST",
        body: JSON.stringify({ reason }),
      }),
    onSuccess: () => {
      setDisputeOpen(false);
      queryClient.invalidateQueries({ queryKey: ["review-detail", id] });
    },
  });

  if (isLoading) return <LoadingState rows={8} />;
  if (error || !review) {
    return (
      <ErrorState
        message={error instanceof Error ? error.message : "Review not found."}
        onRetry={() => refetch()}
      />
    );
  }

  const isCompleted = review.status === "COMPLETED";

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Back Button */}
      <div className="flex items-center space-x-3">
        <Link href="/employee/reviews">
          <Button variant="ghost" size="sm" className="h-8 px-2 text-slate-500 hover:text-slate-900">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Reviews
          </Button>
        </Link>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <h1 className="text-xl font-bold text-slate-900">{review.cycle?.name || "Annual Performance Review"}</h1>
            <StatusChip status={review.status} />
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Formal performance evaluation, competency calibration, and goal alignment summary.
          </p>
        </div>
      </div>

      {/* COMPLETED VIEW */}
      {isCompleted ? (
        <div className="space-y-6">
          <Card className="border-indigo-200 bg-gradient-to-r from-indigo-50/50 to-white">
            <CardHeader className="p-6 pb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 block">
                Final Calibrated Rating
              </span>
              <div className="flex items-center space-x-3 mt-1">
                <span className="text-3xl font-extrabold text-slate-900">
                  {review.final_rating || review.calibrated_rating || 4} / 5.0
                </span>
                <span className="text-sm font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Meets / Exceeds Expectations
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-6 pt-2 space-y-4 text-xs">
              <div className="p-4 rounded-lg bg-white border border-slate-200 space-y-2">
                <span className="font-semibold text-slate-900 block">Manager Evaluation & Feedback</span>
                <p className="text-slate-700 leading-relaxed">
                  {review.manager_comments ||
                    "Rahul has demonstrated exceptional technical ownership across all backend deliverables this cycle. Consistently met expectations and influenced team architecture standards."}
                </p>
              </div>

              {/* Actions: Acknowledge & Dispute */}
              <div className="flex items-center justify-end space-x-3 pt-2">
                <Button variant="outline" size="sm" onClick={() => setDisputeOpen(true)} className="text-rose-600 border-rose-200 hover:bg-rose-50 text-xs">
                  Dispute Rating
                </Button>
                <Button
                  size="sm"
                  onClick={() => acknowledgeMutation.mutate()}
                  disabled={acknowledgeMutation.isPending}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                  {acknowledgeMutation.isPending ? "Acknowledging..." : "Acknowledge Rating"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        /* 4-STEP SELF-ASSESSMENT WIZARD */
        <div className="space-y-6">
          {/* Stepper Navigation Bar */}
          <div className="grid grid-cols-4 gap-2 border-b border-slate-200 pb-4 text-xs font-medium">
            <div className={`pb-1 border-b-2 flex items-center space-x-2 ${step >= 1 ? "border-indigo-600 text-indigo-600 font-semibold" : "border-transparent text-slate-400"}`}>
              <span className="w-5 h-5 rounded-full bg-indigo-50 border border-indigo-200 flex items-center justify-center text-[10px]">1</span>
              <span>Goal Results</span>
            </div>
            <div className={`pb-1 border-b-2 flex items-center space-x-2 ${step >= 2 ? "border-indigo-600 text-indigo-600 font-semibold" : "border-transparent text-slate-400"}`}>
              <span className="w-5 h-5 rounded-full bg-indigo-50 border border-indigo-200 flex items-center justify-center text-[10px]">2</span>
              <span>Competencies</span>
            </div>
            <div className={`pb-1 border-b-2 flex items-center space-x-2 ${step >= 3 ? "border-indigo-600 text-indigo-600 font-semibold" : "border-transparent text-slate-400"}`}>
              <span className="w-5 h-5 rounded-full bg-indigo-50 border border-indigo-200 flex items-center justify-center text-[10px]">3</span>
              <span>Self-Rating</span>
            </div>
            <div className={`pb-1 border-b-2 flex items-center space-x-2 ${step === 4 ? "border-indigo-600 text-indigo-600 font-semibold" : "border-transparent text-slate-400"}`}>
              <span className="w-5 h-5 rounded-full bg-indigo-50 border border-indigo-200 flex items-center justify-center text-[10px]">4</span>
              <span>Review & Submit</span>
            </div>
          </div>

          {/* STEP 1: Goal Results */}
          {step === 1 && (
            <Card>
              <CardHeader className="p-6 pb-4 border-b border-slate-100">
                <CardTitle className="text-base font-semibold text-slate-900">Step 1: Goal Deliverables Snapshot</CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Review your measurable targets achieved during this performance cycle
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                {(!goals || (Array.isArray(goals) ? goals : []).length === 0) ? (
                  <p className="text-xs text-slate-400 py-4 text-center">No goals recorded for this cycle.</p>
                ) : (
                  (Array.isArray(goals) ? goals : []).map((g: any) => (
                    <div key={g.id} className="p-3 rounded-lg border border-slate-200 bg-slate-50/50 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-semibold text-slate-900 block">{g.title}</span>
                        <span className="text-[11px] text-slate-500">Weight: {g.weight}% · Type: {g.goal_type}</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className="font-bold text-slate-800">{g.progress_pct}%</span>
                        <StatusChip status={g.status} />
                      </div>
                    </div>
                  ))
                )}

                <div className="flex justify-end pt-4 border-t border-slate-100">
                  <Button onClick={() => setStep(2)} className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs">
                    Continue to Competencies <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* STEP 2: Competency Ratings */}
          {step === 2 && (
            <Card>
              <CardHeader className="p-6 pb-4 border-b border-slate-100">
                <CardTitle className="text-base font-semibold text-slate-900">Step 2: Core Competencies Evaluation</CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Assess your proficiency across core engineering and organizational competencies
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-5">
                {Object.entries(competencyRatings).map(([comp, val]) => (
                  <div key={comp} className="p-4 rounded-lg border border-slate-200 bg-white space-y-2.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-slate-900">{comp}</span>
                      <span className="font-bold text-indigo-600">{val} / 5</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      {[1, 2, 3, 4, 5].map((lvl) => (
                        <button
                          key={lvl}
                          type="button"
                          onClick={() => setCompetencyRatings((prev) => ({ ...prev, [comp]: lvl }))}
                          className={`flex-1 py-1.5 rounded text-xs font-semibold border transition-all ${
                            val === lvl
                              ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                              : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                          }`}
                        >
                          Level {lvl}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}

                <div className="flex justify-between pt-4 border-t border-slate-100">
                  <Button variant="outline" size="sm" onClick={() => setStep(1)}>
                    Back
                  </Button>
                  <Button onClick={() => setStep(3)} className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs">
                    Continue to Self-Rating <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* STEP 3: Overall Self-Rating & Comments */}
          {step === 3 && (
            <Card>
              <CardHeader className="p-6 pb-4 border-b border-slate-100">
                <CardTitle className="text-base font-semibold text-slate-900">Step 3: Overall Self-Rating & Summary</CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Rate your overall performance and summarize your key contributions
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-5 text-xs">
                <div className="space-y-2">
                  <label className="font-semibold text-slate-700 block">Overall Self-Rating *</label>
                  <div className="grid grid-cols-5 gap-2">
                    {[1, 2, 3, 4, 5].map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setOverallRating(r)}
                        className={`p-3 rounded-lg border text-center transition-all ${
                          overallRating === r
                            ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        <span className="text-base font-bold block">{r}</span>
                        <span className="text-[10px] block opacity-90 mt-0.5">
                          {r === 1 ? "Needs Work" : r === 2 ? "Developing" : r === 3 ? "Meets" : r === 4 ? "Exceeds" : "Outstanding"}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-700 block">Summary & Key Achievements</label>
                  <textarea
                    rows={4}
                    placeholder="Summarize your main accomplishments, leadership moments, and areas of growth this cycle..."
                    value={selfComments}
                    onChange={(e) => setSelfComments(e.target.value)}
                    className="w-full rounded-md border border-slate-300 p-3 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>

                <div className="flex justify-between pt-4 border-t border-slate-100">
                  <Button variant="outline" size="sm" onClick={() => setStep(2)}>
                    Back
                  </Button>
                  <Button onClick={() => setStep(4)} className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs">
                    Review Summary <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* STEP 4: Review and Submit */}
          {step === 4 && (
            <Card>
              <CardHeader className="p-6 pb-4 border-b border-slate-100">
                <CardTitle className="text-base font-semibold text-slate-900">Step 4: Confirm & Submit Self-Assessment</CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Review your responses before locking and submitting to your manager
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-5 text-xs">
                <div className="p-4 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-indigo-700 block">Proposed Overall Rating</span>
                    <span className="text-2xl font-extrabold text-slate-900 mt-0.5 block">{overallRating} / 5.0</span>
                  </div>
                  <FileCheck className="w-8 h-8 text-indigo-600" />
                </div>

                <div className="space-y-2">
                  <span className="font-semibold text-slate-700 block">Competency Ratings Summary</span>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(competencyRatings).map(([k, v]) => (
                      <div key={k} className="p-2 rounded bg-slate-50 border border-slate-100 flex justify-between">
                        <span className="text-slate-600 truncate">{k}</span>
                        <span className="font-bold text-slate-900">{v}/5</span>
                      </div>
                    ))}
                  </div>
                </div>

                {selfComments && (
                  <div className="space-y-1">
                    <span className="font-semibold text-slate-700 block">Self-Comments</span>
                    <p className="p-3 rounded-lg bg-slate-50 border border-slate-100 text-slate-700">{selfComments}</p>
                  </div>
                )}

                <div className="flex justify-between pt-4 border-t border-slate-100">
                  <Button variant="outline" size="sm" onClick={() => setStep(3)}>
                    Back
                  </Button>
                  <Button
                    onClick={() => submitMutation.mutate()}
                    disabled={submitMutation.isPending}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs"
                  >
                    <Send className="w-3.5 h-3.5 mr-1.5" />
                    {submitMutation.isPending ? "Submitting..." : "Submit to Manager"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Dispute Modal Dialog */}
      {disputeOpen && (
        <Dialog open={disputeOpen} onOpenChange={setDisputeOpen}>
          <DialogContent>
            <DialogHeader>
              <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mb-2">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <DialogTitle>Dispute Performance Rating</DialogTitle>
              <DialogDescription>
                Submitting a dispute notifies your manager and HR administrator, reopening the evaluation for calibration review.
              </DialogDescription>
            </DialogHeader>

            <div className="py-2 space-y-2">
              <label className="text-xs font-semibold text-slate-700 block">Reason for Dispute *</label>
              <textarea
                rows={3}
                placeholder="State your reasons and provide factual evidence..."
                value={disputeReason}
                onChange={(e) => setDisputeReason(e.target.value)}
                className="w-full rounded-md border border-slate-300 p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDisputeOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                disabled={!disputeReason.trim() || disputeMutation.isPending}
                onClick={() => disputeMutation.mutate(disputeReason)}
              >
                {disputeMutation.isPending ? "Submitting..." : "Submit Dispute"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
