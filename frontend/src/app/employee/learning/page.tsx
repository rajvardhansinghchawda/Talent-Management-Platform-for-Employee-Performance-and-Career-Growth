"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  BookOpen,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Sparkles,
  ExternalLink,
  GraduationCap,
} from "lucide-react";
import { api, fetchApi } from "@/lib/api/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { StatusChip } from "@/components/shared/StatusChip";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import { formatDate } from "@/lib/utils";

export default function EmployeeLearningPage() {
  const queryClient = useQueryClient();

  const [catalogSearch, setCatalogSearch] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState("");

  // Queries
  const { data: recommendations, isLoading: recLoading } = useQuery({
    queryKey: ["learning-recommendations"],
    queryFn: () => fetchApi<any[]>("/learning/recommendations/"),
  });

  const { data: catalogCourses, isLoading: catLoading } = useQuery({
    queryKey: ["learning-catalog", catalogSearch, difficultyFilter],
    queryFn: () =>
      api.courses.list({
        q: catalogSearch || undefined,
        difficulty: difficultyFilter || undefined,
        is_active: true,
      }),
  });

  const { data: enrollments, isLoading: enrollLoading } = useQuery({
    queryKey: ["my-enrollments"],
    queryFn: () => fetchApi<any[]>("/enrollments/"),
  });

  // Enroll Mutation
  const enrollMutation = useMutation({
    mutationFn: (courseId: string) =>
      fetchApi("/enrollments/", {
        method: "POST",
        body: JSON.stringify({ course: courseId }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-enrollments"] });
      queryClient.invalidateQueries({ queryKey: ["learning-recommendations"] });
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Learning & Development</h1>
        <p className="text-sm text-slate-500 mt-1">
          Targeted course recommendations addressing validated skill gaps, company course catalog, and active enrollments.
        </p>
      </div>

      {/* 3 Tabs */}
      <Tabs defaultValue="recommended" className="w-full">
        <TabsList className="bg-slate-100 p-1 rounded-lg w-full justify-start">
          <TabsTrigger value="recommended">
            <Sparkles className="w-3.5 h-3.5 mr-1.5 text-indigo-600" />
            Recommended for You
          </TabsTrigger>
          <TabsTrigger value="catalog">Course Catalog</TabsTrigger>
          <TabsTrigger value="enrollments">My Enrollments</TabsTrigger>
        </TabsList>

        {/* TAB 1: Recommended */}
        <TabsContent value="recommended" className="space-y-6 mt-6">
          {recLoading ? (
            <LoadingState rows={4} />
          ) : !recommendations || recommendations.length === 0 ? (
            <EmptyState
              title="No recommendations found"
              description="You have completed all courses currently recommended for your target role."
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {recommendations.map((rec: any) => (
                <Card key={rec.id} className="border-indigo-100 bg-gradient-to-br from-indigo-50/20 to-white hover:border-indigo-300 transition-colors">
                  <CardHeader className="p-6 pb-3">
                    <div className="flex justify-between items-start">
                      <Badge variant="default" className="text-[10px] bg-indigo-100 text-indigo-800 border-none font-semibold">
                        {rec.course.difficulty} · {rec.course.duration_hours}h
                      </Badge>
                      <span className="text-xs text-slate-400">{rec.course.provider}</span>
                    </div>
                    <Link href={`/employee/learning/${rec.course.id}`} className="hover:text-indigo-600 transition-colors">
                      <CardTitle className="text-base font-bold text-slate-900 mt-2">
                        {rec.course.title}
                      </CardTitle>
                    </Link>
                  </CardHeader>
                  <CardContent className="p-6 pt-0 space-y-4 text-xs">
                    <div className="p-3 rounded-lg bg-indigo-50/70 border border-indigo-100 text-indigo-900 font-medium">
                      {rec.reason}
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <span className="text-slate-500">Focus: <strong>{rec.skill?.name}</strong></span>
                      <Button
                        size="sm"
                        disabled={rec.is_enrolled || enrollMutation.isPending}
                        onClick={() => enrollMutation.mutate(rec.course.id)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs"
                      >
                        {rec.is_enrolled ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                            Enrolled
                          </>
                        ) : (
                          "Enroll Now"
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* TAB 2: Catalog */}
        <TabsContent value="catalog" className="space-y-6 mt-6">
          {/* Search Toolbar */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                placeholder="Search catalog by title, skill, or provider..."
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>
            <div className="w-full sm:w-48">
              <select
                value={difficultyFilter}
                onChange={(e) => setDifficultyFilter(e.target.value)}
                className="w-full h-9 px-3 rounded-md border border-slate-300 bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600"
              >
                <option value="">All Difficulties</option>
                <option value="BEGINNER">Beginner</option>
                <option value="INTERMEDIATE">Intermediate</option>
                <option value="ADVANCED">Advanced</option>
              </select>
            </div>
          </div>

          {catLoading ? (
            <LoadingState rows={4} />
          ) : !catalogCourses || catalogCourses.length === 0 ? (
            <EmptyState title="No courses found" description="Try adjusting your search query." />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {catalogCourses.map((c) => (
                <Card key={c.id} className="hover:border-indigo-300 transition-colors flex flex-col justify-between">
                  <CardHeader className="p-6 pb-2">
                    <div className="flex justify-between items-start text-xs text-slate-400 mb-1">
                      <span>{c.provider}</span>
                      <Badge variant="secondary" className="text-[10px]">{c.difficulty}</Badge>
                    </div>
                    <Link href={`/employee/learning/${c.id}`} className="hover:text-indigo-600 transition-colors">
                      <CardTitle className="text-sm font-bold text-slate-900 leading-snug">
                        {c.title}
                      </CardTitle>
                    </Link>
                    <CardDescription className="text-xs text-slate-500 line-clamp-2 mt-1">
                      {c.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-6 pt-2 space-y-3 text-xs">
                    <div className="flex items-center space-x-2 text-slate-500 text-[11px]">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{c.duration_hours} hours · {c.format}</span>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-slate-400 text-[11px]">{c.enrollment_count || 12} enrolled</span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => enrollMutation.mutate(c.id)}
                        className="text-xs"
                      >
                        Enroll
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* TAB 3: My Enrollments */}
        <TabsContent value="enrollments" className="space-y-6 mt-6">
          {enrollLoading ? (
            <LoadingState rows={3} />
          ) : !enrollments || enrollments.length === 0 ? (
            <EmptyState
              title="No active enrollments"
              description="Explore the catalog or recommendations above to enroll in your next course."
            />
          ) : (
            <div className="space-y-4">
              {enrollments.map((en) => (
                <Card key={en.id} className="p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <h4 className="text-sm font-bold text-slate-900">{en.course?.title}</h4>
                        <StatusChip status={en.status} />
                      </div>
                      <p className="text-slate-500">
                        Provider: {en.course?.provider} · Enrolled {formatDate(en.enrolled_at)}
                      </p>
                    </div>

                    <div className="flex items-center space-x-4">
                      <div className="w-32 space-y-1">
                        <div className="flex justify-between text-[11px] font-semibold text-slate-700">
                          <span>Progress</span>
                          <span>{en.progress_pct}%</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                          <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${en.progress_pct}%` }} />
                        </div>
                      </div>

                      <Link href={`/employee/learning/${en.course?.id}`}>
                        <Button size="sm" variant="outline" className="text-xs">
                          Continue Learning
                        </Button>
                      </Link>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
