"use client";

import React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { FileText, CheckCircle2, Clock, ArrowRight, Eye, AlertCircle } from "lucide-react";
import { fetchApi } from "@/lib/api/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusChip } from "@/components/shared/StatusChip";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import { formatDate } from "@/lib/utils";

export default function EmployeeReviewsListPage() {
  const {
    data: reviews,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["employee-reviews"],
    queryFn: () => fetchApi<any[]>("/reviews/"),
  });

  if (isLoading) return <LoadingState rows={4} />;
  if (error) {
    return (
      <ErrorState
        message={error instanceof Error ? error.message : "Failed to load reviews."}
        onRetry={() => refetch()}
      />
    );
  }

  const reviewList = Array.isArray(reviews) ? reviews : (reviews as any)?.results || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">My Performance Reviews</h1>
        <p className="text-sm text-slate-500 mt-1">
          Review cycles, self-assessments, manager evaluations, and finalized ratings.
        </p>
      </div>

      {reviewList.length === 0 ? (
        <EmptyState
          title="No reviews in progress"
          description="You do not have any pending review cycles assigned at this time."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {reviewList.map((r: any) => (
            <Card key={r.id} className="border-slate-200 hover:border-indigo-300 transition-colors">
              <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold text-slate-900">{r.cycle.name}</CardTitle>
                  <CardDescription className="text-xs text-slate-500 mt-0.5">
                    {formatDate(r.cycle.start_date)} — {formatDate(r.cycle.end_date)}
                  </CardDescription>
                </div>
                <StatusChip status={r.status} />
              </CardHeader>
              <CardContent className="p-6 space-y-4 text-xs">
                {/* Status Stepper Summary */}
                <div className="grid grid-cols-4 gap-1 text-center py-2 bg-slate-50 rounded-lg border border-slate-100">
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-400 block font-semibold">Self</span>
                    <span className={`text-xs font-bold ${r.self_rating ? "text-emerald-600" : "text-slate-400"}`}>
                      {r.self_rating ? `${r.self_rating}/5` : "Pending"}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-400 block font-semibold">Manager</span>
                    <span className={`text-xs font-bold ${r.manager_rating ? "text-emerald-600" : "text-slate-400"}`}>
                      {r.manager_rating ? `${r.manager_rating}/5` : "Pending"}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-400 block font-semibold">Calibrated</span>
                    <span className={`text-xs font-bold ${r.calibrated_rating ? "text-indigo-600" : "text-slate-400"}`}>
                      {r.calibrated_rating ? `${r.calibrated_rating}/5` : "Pending"}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-400 block font-semibold">Outcome</span>
                    <span className="text-xs font-bold text-slate-700 capitalize">{r.status.toLowerCase()}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <span className="text-slate-500 text-[11px]">Next Action Required</span>
                  <Link href={`/employee/reviews/${r.id}`}>
                    <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs">
                      {r.next_action === "START_SELF_ASSESSMENT" ? (
                        <>Start Self-Assessment <ArrowRight className="w-3.5 h-3.5 ml-1" /></>
                      ) : r.next_action === "VIEW_RESULT" ? (
                        <>View Final Result <Eye className="w-3.5 h-3.5 ml-1" /></>
                      ) : (
                        <>Open Review <Eye className="w-3.5 h-3.5 ml-1" /></>
                      )}
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
