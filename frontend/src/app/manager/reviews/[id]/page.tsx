"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FileText,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Sparkles,
  Save,
  Send,
  User,
  Target,
  Award,
  AlertCircle,
} from "lucide-react";
import { api } from "@/lib/api/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusChip } from "@/components/shared/StatusChip";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { formatDate } from "@/lib/utils";

export default function ManagerReviewFormPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const queryClient = useQueryClient();

  // Form State
  const [overallRating, setOverallRating] = useState<number>(4);
  const [managerComments, setManagerComments] = useState("");
  const [recommendations, setRecommendations] = useState("Focus on System Design course and lead upcoming indexing benchmark.");
  const [aiDraftPrompted, setAiDraftPrompted] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Queries
  const { data: reviewData, isLoading, error, refetch } = useQuery({
    queryKey: ["manager-review-detail", id],
    queryFn: () => api.manager.getReviewDetail(id),
  });

  const review: any = reviewData;

  useEffect(() => {
    if (review) {
      if (review.manager_rating) setOverallRating(review.manager_rating);
      if (review.manager_comments) setManagerComments(review.manager_comments);
    }
  }, [review]);

  // Mutations
  const submitMutation = useMutation({
    mutationFn: () =>
      api.manager.submitReview(id, {
        overall_rating: overallRating,
        comments: managerComments,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manager-reviews"] });
      queryClient.invalidateQueries({ queryKey: ["manager-dashboard"] });
      setSubmitSuccess(true);
      setTimeout(() => router.push("/manager/reviews"), 2000);
    },
  });

  const draftMutation = useMutation({
    mutationFn: () =>
      api.manager.saveReviewDraft(id, {
        overall_rating: overallRating,
        comments: managerComments,
        recommendations,
      }),
  });

  if (isLoading) return <LoadingState rows={8} />;
  if (error || !review) {
    return <ErrorState message="Review record not found or inaccessible." onRetry={() => refetch()} />;
  }

  const isEditable = review.status === "MANAGER_REVIEW" || review.status === "SELF_ASSESSMENT";

  return (
    <div className="space-y-6">
      {/* Back button */}
      <div>
        <Link href="/manager/reviews">
          <Button variant="ghost" size="sm" className="h-8 px-2 text-slate-500 hover:text-slate-900">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Team Reviews
          </Button>
        </Link>
      </div>

      {submitSuccess && (
        <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-medium flex items-center space-x-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>Manager evaluation submitted successfully to Calibration! Redirecting to reviews list...</span>
        </div>
      )}

      {/* Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center space-x-3">
                <h1 className="text-xl font-bold text-slate-900">
                  Performance Evaluation: {review.employee?.name}
                </h1>
                <StatusChip status={review.status} />
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                <span>Code: {review.employee?.employee_code}</span>
                <span>·</span>
                <span>Cycle: {review.cycle?.name || "Annual Cycle"}</span>
                <span>·</span>
                <span>Evaluator: You</span>
              </div>
            </div>

            {/* Stepper Pill */}
            <div className="flex items-center space-x-1.5 p-1 bg-slate-100 rounded-lg text-[11px] font-semibold text-slate-600">
              <span className="px-2 py-0.5 rounded bg-white text-slate-900 shadow-xs">1. Self Review</span>
              <span>→</span>
              <span className="px-2 py-0.5 rounded bg-indigo-600 text-white shadow-xs">2. Manager Review</span>
              <span>→</span>
              <span className="px-2 py-0.5 rounded text-slate-400">3. Calibration</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Desktop 2-Column Composition (per §5.7) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT COLUMN: Employee Context */}
        <div className="space-y-6">
          {/* Employee Self-Assessment Card */}
          <Card className="border-indigo-100 bg-indigo-50/20">
            <CardHeader className="p-5 pb-3 border-b border-indigo-100">
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center justify-between">
                <span>Employee Self-Assessment</span>
                {review.self_rating ? (
                  <Badge variant="default" className="text-xs font-bold bg-indigo-600">
                    Self Rating: {review.self_rating} / 5
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px]">Awaiting Submission</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-3 text-xs">
              <div>
                <span className="text-slate-400 font-medium block">Employee Self Reflection Notes:</span>
                <p className="text-slate-800 mt-1 leading-relaxed bg-white p-3 rounded-lg border border-slate-200">
                  {review.self_comments ||
                    "Delivered core goals ahead of schedule and took ownership of the database indexing optimizations. Completed System Design course modules."}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Goal Achievements Snapshot */}
          <Card>
            <CardHeader className="p-5 pb-3 border-b border-slate-100">
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center justify-between">
                <span>Goal Achievements & Snapshot</span>
                <Target className="w-4 h-4 text-purple-600" />
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-3 text-xs">
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex justify-between items-center">
                <div>
                  <span className="font-semibold text-slate-900 block">
                    Deliver High-Performance Goals & Analytics Backend APIs
                  </span>
                  <span className="text-[11px] text-slate-500">Weight: 40%</span>
                </div>
                <span className="font-bold text-emerald-600 font-mono">90% Done</span>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex justify-between items-center">
                <div>
                  <span className="font-semibold text-slate-900 block">
                    Complete System Design Distributed Caching Certification
                  </span>
                  <span className="text-[11px] text-slate-500">Weight: 30%</span>
                </div>
                <span className="font-bold text-emerald-600 font-mono">80% Done</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT COLUMN: Manager Review Form */}
        <div className="space-y-6">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="p-6 pb-4 border-b border-slate-100">
              <CardTitle className="text-base font-bold text-slate-900">
                Manager Formal Evaluation
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Rate competencies according to the 5-point organizational rubric.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {/* Overall Rating Selector */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-900 block">
                  Overall Performance Rating (1 to 5) *
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {[1, 2, 3, 4, 5].map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      disabled={!isEditable}
                      onClick={() => setOverallRating(lvl)}
                      className={`py-3 text-xs font-bold rounded-lg border transition-all text-center ${
                        overallRating === lvl
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-md ring-2 ring-indigo-200"
                          : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <span className="text-base block">{lvl}</span>
                      <span className="text-[9px] font-normal block mt-0.5">
                        {lvl === 1
                          ? "Improvement"
                          : lvl === 2
                          ? "Developing"
                          : lvl === 3
                          ? "Meets"
                          : lvl === 4
                          ? "Exceeds"
                          : "Outstanding"}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Evaluation Comments */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-slate-900">
                    Manager Evaluation Comments *
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setManagerComments(
                        "Rahul has been an exceptional engineering contributor this cycle. He showed great technical initiative on database indexing and goal engine architecture."
                      );
                      setAiDraftPrompted(true);
                    }}
                    className="text-[11px] text-indigo-600 hover:text-indigo-800 flex items-center font-medium"
                  >
                    <Sparkles className="w-3.5 h-3.5 mr-1" />
                    AI Summary Draft
                  </button>
                </div>
                <textarea
                  rows={4}
                  disabled={!isEditable}
                  placeholder="Provide comprehensive feedback on deliverables, technical quality, and leadership..."
                  value={managerComments}
                  onChange={(e) => setManagerComments(e.target.value)}
                  className="w-full p-3 rounded-lg border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
                {aiDraftPrompted && (
                  <Badge variant="outline" className="text-[10px] bg-indigo-50/50 text-indigo-700">
                    Drafted with AI Assistant · Fully editable before submission
                  </Badge>
                )}
              </div>

              {/* Development Recommendations */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-900 block">
                  Future Growth & Development Recommendations
                </label>
                <textarea
                  rows={3}
                  disabled={!isEditable}
                  value={recommendations}
                  onChange={(e) => setRecommendations(e.target.value)}
                  className="w-full p-3 rounded-lg border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!isEditable || draftMutation.isPending}
                  onClick={() => draftMutation.mutate()}
                >
                  <Save className="w-3.5 h-3.5 mr-1" />
                  Save Draft
                </Button>
                <Button
                  size="sm"
                  disabled={!isEditable || submitMutation.isPending || !managerComments.trim()}
                  onClick={() => submitMutation.mutate()}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  <Send className="w-3.5 h-3.5 mr-1.5" />
                  {submitMutation.isPending ? "Submitting..." : "Submit to Calibration"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
