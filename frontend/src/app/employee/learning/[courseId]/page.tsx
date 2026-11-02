"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  BookOpen,
  ArrowLeft,
  Clock,
  Award,
  CheckCircle2,
  ExternalLink,
  GraduationCap,
  Layers,
} from "lucide-react";
import { api, fetchApi } from "@/lib/api/client";
import type { Course } from "@/lib/api/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";

export default function CourseDetailPage() {
  const params = useParams();
  const courseId = params.courseId as string;
  const router = useRouter();
  const queryClient = useQueryClient();

  const {
    data: course,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["course-detail", courseId],
    queryFn: () => api.courses.get(courseId),
  });

  const { data: enrollments } = useQuery({
    queryKey: ["my-enrollments"],
    queryFn: () => fetchApi<any[]>("/enrollments/"),
  });

  const enrollMutation = useMutation({
    mutationFn: () =>
      fetchApi("/enrollments/", {
        method: "POST",
        body: JSON.stringify({ course: courseId }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-enrollments"] });
    },
  });

  if (isLoading) return <LoadingState rows={6} />;
  if (error || !course) {
    return (
      <ErrorState
        message={error instanceof Error ? error.message : "Course not found."}
        onRetry={() => refetch()}
      />
    );
  }

  const isEnrolled = enrollments?.some((en: any) => en.course?.id === courseId);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header & Back */}
      <div className="flex items-center space-x-3">
        <Link href="/employee/learning">
          <Button variant="ghost" size="sm" className="h-8 px-2 text-slate-500 hover:text-slate-900">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Learning Catalog
          </Button>
        </Link>
      </div>

      <div className="border-b border-slate-200 pb-4 space-y-1">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <Badge variant="default" className="text-xs bg-indigo-100 text-indigo-800 border-none font-semibold">
            {course.difficulty}
          </Badge>
          <Badge variant="secondary" className="text-xs">
            {course.format}
          </Badge>
          <span className="text-xs text-slate-500">Provided by <strong>{course.provider}</strong></span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">{course.title}</h1>
      </div>

      {/* Main Grid: Content (2 col) + Action Sidebar (1 col) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 spans) */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="p-6 pb-3 border-b border-slate-100">
              <CardTitle className="text-base font-semibold text-slate-900">Syllabus & Overview</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4 text-xs leading-relaxed text-slate-700">
              <p>{course.description || "In-depth structured curriculum designed to build verified engineering capabilities."}</p>
              {course.overview && <p>{course.overview}</p>}
            </CardContent>
          </Card>

          {/* Skills Mapped */}
          <Card>
            <CardHeader className="p-6 pb-3 border-b border-slate-100">
              <CardTitle className="text-base font-semibold text-slate-900 flex items-center space-x-2">
                <Award className="w-4 h-4 text-indigo-600" />
                <span>Skills Taught & Target Level Range</span>
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 mt-0.5">
                Completing this course satisfies validation criteria for the following competencies
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-3">
              {!course.skills || course.skills.length === 0 ? (
                <p className="text-xs text-slate-400 py-3 text-center">No specific skill mappings configured.</p>
              ) : (
                course.skills.map((s) => (
                  <div key={s.id} className="p-3 rounded-lg border border-slate-200 bg-slate-50/50 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-slate-900 block">{s.skill_name}</span>
                      <span className="text-[11px] text-slate-500">{s.category || "Engineering"}</span>
                    </div>
                    <Badge variant="success" className="text-xs font-semibold">
                      Level {s.level_from} &rarr; Level {s.level_to}
                    </Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column (1 span): Enrollment Card */}
        <div className="space-y-6">
          <Card className="border-indigo-100 shadow-sm bg-gradient-to-br from-indigo-50/30 to-white">
            <CardHeader className="p-6 pb-2 border-b border-slate-100">
              <span className="text-[10px] uppercase font-bold text-indigo-600 block tracking-wider">
                Course Details
              </span>
              <CardTitle className="text-lg font-extrabold text-slate-900 mt-0.5">
                {course.duration_hours} Total Hours
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4 text-xs">
              <div className="space-y-2.5 divide-y divide-slate-100">
                <div className="flex justify-between items-center pt-2">
                  <span className="text-slate-500">Delivery Format:</span>
                  <span className="font-semibold text-slate-800">{course.format}</span>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <span className="text-slate-500">Difficulty:</span>
                  <span className="font-semibold text-slate-800">{course.difficulty}</span>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <span className="text-slate-500">Active Learners:</span>
                  <span className="font-semibold text-slate-800">{course.enrollment_count || 12} enrolled</span>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100">
                {isEnrolled ? (
                  <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold text-center flex items-center justify-center space-x-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Already Enrolled</span>
                  </div>
                ) : (
                  <Button
                    onClick={() => enrollMutation.mutate()}
                    disabled={enrollMutation.isPending}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs h-9"
                  >
                    {enrollMutation.isPending ? "Enrolling..." : "Enroll in Course"}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
