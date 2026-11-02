"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  BookOpen,
  Plus,
  Search,
  Filter,
  Edit2,
  Clock,
  Users,
  CheckCircle2,
  Award,
  Layers,
} from "lucide-react";
import { api } from "@/lib/api/client";
import type { Course, Skill } from "@/lib/api/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function CoursesPage() {
  const queryClient = useQueryClient();

  const [q, setQ] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [courseFormat, setCourseFormat] = useState("");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [title, setTitle] = useState("");
  const [provider, setProvider] = useState("");
  const [providerUrl, setProviderUrl] = useState("");
  const [desc, setDesc] = useState("");
  const [diff, setDiff] = useState<"BEGINNER" | "INTERMEDIATE" | "ADVANCED">("INTERMEDIATE");
  const [fmt, setFmt] = useState<"ONLINE" | "IN_PERSON" | "BLENDED" | "SELF_PACED">("ONLINE");
  const [duration, setDuration] = useState("16.0");
  const [isActive, setIsActive] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);

  // Skill Mapping Dialog
  const [skillMappingOpen, setSkillMappingOpen] = useState(false);
  const [selectedCourseForSkill, setSelectedCourseForSkill] = useState<Course | null>(null);
  const [mapSkillId, setMapSkillId] = useState("");
  const [levelFrom, setLevelFrom] = useState(1);
  const [levelTo, setLevelTo] = useState(3);
  const [mapError, setMapError] = useState<string | null>(null);

  // Queries
  const { data: coursesData, isLoading, error, refetch } = useQuery({
    queryKey: ["courses", { q, difficulty, format: courseFormat }],
    queryFn: () =>
      api.courses.list({
        q: q || undefined,
        difficulty: difficulty || undefined,
        format: courseFormat || undefined,
      }),
  });

  const { data: allSkills } = useQuery({
    queryKey: ["skills-active"],
    queryFn: () => api.skills.list({ is_active: true }),
  });

  // Mutations
  const saveCourseMutation = useMutation({
    mutationFn: (data: any) => {
      if (editingCourse) {
        return api.courses.update(editingCourse.id, data);
      }
      return api.courses.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["courses"] });
      setDialogOpen(false);
      resetForm();
    },
    onError: (err: any) => {
      setFormError(err.message || "Failed to save course.");
    },
  });

  const mapSkillMutation = useMutation({
    mutationFn: ({ courseId, mappings }: { courseId: string; mappings: any[] }) =>
      api.courses.setSkills(courseId, mappings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["courses"] });
      setSkillMappingOpen(false);
      setMapSkillId("");
    },
    onError: (err: any) => {
      setMapError(err.message || "Failed to map skill to course.");
    },
  });

  const resetForm = () => {
    setEditingCourse(null);
    setTitle("");
    setProvider("");
    setProviderUrl("");
    setDesc("");
    setDiff("INTERMEDIATE");
    setFmt("ONLINE");
    setDuration("16.0");
    setIsActive(true);
    setFormError(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (course: Course) => {
    setEditingCourse(course);
    setTitle(course.title);
    setProvider(course.provider);
    setProviderUrl(course.provider_url || "");
    setDesc(course.description);
    setDiff(course.difficulty);
    setFmt(course.format);
    setDuration(String(course.duration_hours));
    setIsActive(course.is_active);
    setFormError(null);
    setDialogOpen(true);
  };

  const openMappingDialog = (course: Course) => {
    setSelectedCourseForSkill(course);
    setMapSkillId(course.skills?.[0]?.skill || "");
    setLevelFrom(course.skills?.[0]?.level_from || 1);
    setLevelTo(course.skills?.[0]?.level_to || 3);
    setMapError(null);
    setSkillMappingOpen(true);
  };

  const handleSaveCourse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !provider.trim()) {
      setFormError("Course title and provider are required.");
      return;
    }
    saveCourseMutation.mutate({
      title,
      provider,
      provider_url: providerUrl,
      description: desc,
      difficulty: diff,
      format: fmt,
      duration_hours: Number(duration) || 0,
      is_active: isActive,
    });
  };

  const handleMapSkill = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourseForSkill || !mapSkillId) {
      setMapError("Please select a competency skill to map.");
      return;
    }
    if (levelFrom >= levelTo) {
      setMapError("Target level (to) must be strictly greater than start level (from).");
      return;
    }
    mapSkillMutation.mutate({
      courseId: selectedCourseForSkill.id,
      mappings: [{ skill: mapSkillId, level_from: levelFrom, level_to: levelTo }],
    });
  };

  const courses: Course[] = Array.isArray(coursesData) ? coursesData : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Course Catalog</h1>
          <p className="text-sm text-slate-500 mt-1">
            Training courses, skill-gap learning interventions, provider mappings, and completion statistics.
          </p>
        </div>
        <Button onClick={openCreateDialog} size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white">
          <Plus className="w-4 h-4 mr-1.5" />
          Add Course
        </Button>
      </div>

      {/* Filter Row */}
      <Card>
        <CardContent className="p-4 flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              placeholder="Search course title or provider..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>

          <div className="w-full sm:w-44">
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              className="w-full h-9 px-3 rounded-md border border-slate-300 bg-white text-xs text-slate-800"
            >
              <option value="">All Difficulties</option>
              <option value="BEGINNER">Beginner</option>
              <option value="INTERMEDIATE">Intermediate</option>
              <option value="ADVANCED">Advanced</option>
            </select>
          </div>

          <div className="w-full sm:w-44">
            <select
              value={courseFormat}
              onChange={(e) => setCourseFormat(e.target.value)}
              className="w-full h-9 px-3 rounded-md border border-slate-300 bg-white text-xs text-slate-800"
            >
              <option value="">All Formats</option>
              <option value="ONLINE">Online</option>
              <option value="IN_PERSON">In Person</option>
              <option value="BLENDED">Blended</option>
              <option value="SELF_PACED">Self-Paced</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Courses Table */}
      {isLoading ? (
        <LoadingState rows={6} />
      ) : error ? (
        <ErrorState message="Failed to load course catalog." onRetry={() => refetch()} />
      ) : courses.length === 0 ? (
        <EmptyState
          title="No courses found"
          description="Add training courses mapped to specific competencies to enable automated skill development recommendations."
          actionLabel="Add Course"
          onAction={openCreateDialog}
        />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-72">Course Title</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Mapped Competency</TableHead>
                  <TableHead>Format / Level</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Enrollments</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {courses.map((c) => (
                  <TableRow key={c.id} className="hover:bg-slate-50/75">
                    <TableCell className="font-semibold text-xs text-slate-900">
                      <span className="block font-bold text-slate-900">{c.title}</span>
                      <span className="text-slate-400 text-[11px] font-normal max-w-xs truncate block">
                        {c.description || "Training deliverable"}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-slate-600 font-medium">{c.provider}</TableCell>
                    <TableCell>
                      {c.skills && c.skills.length > 0 ? (
                        <div className="space-y-1">
                          {c.skills.map((s, idx) => (
                            <Badge key={idx} variant="outline" className="text-[10px] bg-indigo-50/50 border-indigo-200 text-indigo-800 block w-fit">
                              {s.skill_name} (L{s.level_from} → L{s.level_to})
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">No skill mapped</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-slate-600">
                      <span className="capitalize">{c.format.toLowerCase().replace(/_/g, " ")}</span>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">{c.difficulty}</span>
                    </TableCell>
                    <TableCell className="text-xs text-slate-600">
                      <span className="flex items-center">
                        <Clock className="w-3.5 h-3.5 mr-1 text-slate-400" />
                        {c.duration_hours} hrs
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-slate-700">
                      <span className="font-semibold">{c.enrollment_count}</span>
                      <span className="text-[10px] text-slate-400 block">
                        {Math.round(c.completion_rate * 100)}% completion
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={c.is_active ? "success" : "secondary"} className="text-xs">
                        {c.is_active ? "Active" : "Archived"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openMappingDialog(c)}
                          className="h-8 px-2 text-indigo-600 hover:bg-indigo-50 text-xs"
                          title="Map Skills"
                        >
                          <Award className="w-3.5 h-3.5 mr-1" />
                          Map Skills
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(c)}
                          className="h-8 px-2 text-slate-600 hover:text-indigo-600"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingCourse ? `Edit ${editingCourse.title}` : "Add New Course"}</DialogTitle>
            <DialogDescription>
              Register learning content into the catalog to fulfill skill gap recommendations.
            </DialogDescription>
          </DialogHeader>

          {formError && (
            <div className="p-2.5 rounded bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
              {formError}
            </div>
          )}

          <form onSubmit={handleSaveCourse} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Course Title *</label>
              <Input
                placeholder="e.g. Fullstack React & Next.js in Production"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Provider *</label>
                <Input
                  placeholder="e.g. Acme Internal, Coursera, Udemy"
                  value={provider}
                  onChange={(e) => setProvider(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Provider URL</label>
                <Input
                  type="url"
                  placeholder="https://..."
                  value={providerUrl}
                  onChange={(e) => setProviderUrl(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Difficulty</label>
                <select
                  value={diff}
                  onChange={(e) => setDiff(e.target.value as any)}
                  className="w-full h-9 px-2 rounded-md border border-slate-300 bg-white text-xs text-slate-800"
                >
                  <option value="BEGINNER">Beginner</option>
                  <option value="INTERMEDIATE">Intermediate</option>
                  <option value="ADVANCED">Advanced</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Format</label>
                <select
                  value={fmt}
                  onChange={(e) => setFmt(e.target.value as any)}
                  className="w-full h-9 px-2 rounded-md border border-slate-300 bg-white text-xs text-slate-800"
                >
                  <option value="ONLINE">Online</option>
                  <option value="SELF_PACED">Self-Paced</option>
                  <option value="IN_PERSON">In Person</option>
                  <option value="BLENDED">Blended</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Duration (Hours)</label>
                <Input
                  type="number"
                  step="0.5"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Description</label>
              <textarea
                placeholder="Overview of syllabus, modules, and learning objectives..."
                rows={3}
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                className="w-full p-2.5 rounded-md border border-slate-300 text-xs text-slate-900"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button variant="outline" type="button" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saveCourseMutation.isPending} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                {saveCourseMutation.isPending ? "Saving..." : "Save Course"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Map Skill Dialog */}
      {selectedCourseForSkill && (
        <Dialog open={skillMappingOpen} onOpenChange={setSkillMappingOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Map Skill to Course</DialogTitle>
              <DialogDescription>
                When an employee completes <strong>{selectedCourseForSkill.title}</strong>, their competency will advance from level {levelFrom} to {levelTo}.
              </DialogDescription>
            </DialogHeader>

            {mapError && (
              <div className="p-2.5 rounded bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
                {mapError}
              </div>
            )}

            <form onSubmit={handleMapSkill} className="space-y-4 py-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Competency Skill *</label>
                <select
                  value={mapSkillId}
                  onChange={(e) => setMapSkillId(e.target.value)}
                  className="w-full h-9 px-3 rounded-md border border-slate-300 bg-white text-xs text-slate-800"
                  required
                >
                  <option value="">Choose a skill...</option>
                  {allSkills?.map((s: Skill) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.category || "General"})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Start Proficiency (From Level)</label>
                  <select
                    value={levelFrom}
                    onChange={(e) => setLevelFrom(Number(e.target.value))}
                    className="w-full h-9 px-3 rounded-md border border-slate-300 bg-white text-xs text-slate-800"
                  >
                    {[1, 2, 3, 4].map((lvl) => (
                      <option key={lvl} value={lvl}>
                        Level {lvl}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Target Proficiency (To Level)</label>
                  <select
                    value={levelTo}
                    onChange={(e) => setLevelTo(Number(e.target.value))}
                    className="w-full h-9 px-3 rounded-md border border-slate-300 bg-white text-xs text-slate-800"
                  >
                    {[2, 3, 4, 5].map((lvl) => (
                      <option key={lvl} value={lvl}>
                        Level {lvl}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <DialogFooter className="pt-2">
                <Button variant="outline" type="button" onClick={() => setSkillMappingOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={mapSkillMutation.isPending} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                  {mapSkillMutation.isPending ? "Mapping..." : "Save Mapping"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
