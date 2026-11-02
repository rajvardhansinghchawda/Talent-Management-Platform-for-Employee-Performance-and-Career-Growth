"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Briefcase,
  ArrowLeft,
  Plus,
  Trash2,
  Award,
  ArrowRight,
  Users,
  ShieldCheck,
  Clock,
  Sparkles,
} from "lucide-react";
import { api } from "@/lib/api/client";
import type { JobRole, Skill, RoleSkill, CareerPathStep, Employee } from "@/lib/api/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
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

export default function RoleDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const queryClient = useQueryClient();

  // Add Skill Requirement Dialog
  const [skillDialogOpen, setSkillDialogOpen] = useState(false);
  const [selectedSkillId, setSelectedSkillId] = useState("");
  const [requiredLevel, setRequiredLevel] = useState(3);
  const [weight, setWeight] = useState(4);
  const [isMustHave, setIsMustHave] = useState(true);

  // Add Career Step Dialog
  const [stepDialogOpen, setStepDialogOpen] = useState(false);
  const [targetRoleId, setTargetRoleId] = useState("");
  const [durationMonths, setDurationMonths] = useState(24);

  // Queries
  const { data: role, isLoading, error, refetch } = useQuery({
    queryKey: ["job-role", id],
    queryFn: () => api.jobRoles.get(id),
  });

  const { data: allSkills } = useQuery({
    queryKey: ["skills-active"],
    queryFn: () => api.skills.list({ is_active: true }),
  });

  const { data: allRoles } = useQuery({
    queryKey: ["job-roles-all"],
    queryFn: () => api.jobRoles.list(),
  });

  const { data: roleEmployees } = useQuery({
    queryKey: ["role-employees", id],
    queryFn: () => api.employees.list({ job_role: id }),
    enabled: !!id,
  });

  // Mutations
  const addSkillMutation = useMutation({
    mutationFn: (data: { skill: string; required_level: number; weight: number; is_must_have?: boolean }) =>
      api.jobRoles.addSkill(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["job-role", id] });
      setSkillDialogOpen(false);
      setSelectedSkillId("");
    },
  });

  const removeSkillMutation = useMutation({
    mutationFn: (skillId: string) => api.jobRoles.deleteSkill(id, skillId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["job-role", id] });
    },
  });

  const addStepMutation = useMutation({
    mutationFn: (data: { to_role: string; typical_duration_months?: number }) =>
      api.jobRoles.addCareerStep(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["job-role", id] });
      setStepDialogOpen(false);
      setTargetRoleId("");
    },
  });

  const removeStepMutation = useMutation({
    mutationFn: (toRoleId: string) => api.jobRoles.deleteCareerStep(id, toRoleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["job-role", id] });
    },
  });

  if (isLoading) return <LoadingState rows={8} />;
  if (error || !role) {
    return <ErrorState message="Job role not found." onRetry={() => refetch()} />;
  }

  const roleSkills = role.skills || [];
  const nextRoles = role.next_roles || [];
  const employeesList: Employee[] = Array.isArray(roleEmployees)
    ? roleEmployees
    : roleEmployees?.results || [];

  return (
    <div className="space-y-6">
      {/* Back button */}
      <div>
        <Link href="/hr/roles">
          <Button variant="ghost" size="sm" className="h-8 px-2 text-slate-500 hover:text-slate-900">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Job Roles
          </Button>
        </Link>
      </div>

      {/* Role Header Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center space-x-3">
                <h1 className="text-xl font-bold text-slate-900">{role.title}</h1>
                <Badge variant="outline" className="font-mono text-indigo-700 bg-indigo-50 border-indigo-200">
                  Track: {role.track} · Level {role.level}
                </Badge>
                {role.is_critical && (
                  <Badge variant="destructive" className="text-[10px] uppercase">
                    Critical Role
                  </Badge>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                <span>Department: {role.department_name || "Company-Wide"}</span>
                <span>·</span>
                <span>Minimum Tenure: {role.min_months_in_role || 24} Months</span>
                <span>·</span>
                <span>{role.employee_count} Current Employees</span>
              </div>
            </div>
          </div>

          {role.description && (
            <p className="text-xs text-slate-600 mt-4 pt-4 border-t border-slate-100 leading-relaxed">
              {role.description}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Section 1: Skill Requirements Editor */}
      <Card>
        <CardHeader className="p-6 pb-4 border-b border-slate-100 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold text-slate-900 flex items-center space-x-2">
              <Award className="w-4 h-4 text-indigo-600" />
              <span>Competency & Skill Requirements</span>
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 mt-0.5">
              Defines the benchmark proficiency levels driving gap analysis and employee readiness scores.
            </CardDescription>
          </div>
          <Button size="sm" onClick={() => setSkillDialogOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs">
            <Plus className="w-3.5 h-3.5 mr-1" />
            Add Requirement
          </Button>
        </CardHeader>
        <CardContent className="p-6">
          {roleSkills.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center italic">
              No skill requirements mapped yet. Click 'Add Requirement' to set required competency benchmarks.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Competency Skill</TableHead>
                    <TableHead>Required Level</TableHead>
                    <TableHead>Importance Weight</TableHead>
                    <TableHead>Must-Have Gate</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {roleSkills.map((rs: any) => (
                    <TableRow key={rs.id || rs.skill} className="hover:bg-slate-50/75">
                      <TableCell className="font-semibold text-xs text-slate-900">
                        {rs.skill_name || "Skill"}
                      </TableCell>
                      <TableCell className="text-xs font-bold text-indigo-600">
                        Level {rs.required_level} / 5
                      </TableCell>
                      <TableCell className="text-xs text-slate-700">
                        Weight: {rs.weight} / 5
                      </TableCell>
                      <TableCell>
                        {rs.is_must_have ? (
                          <Badge variant="destructive" className="text-[10px]">
                            Required Gate
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px]">
                            Optional
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeSkillMutation.mutate(rs.skill)}
                          className="h-8 px-2 text-rose-600 hover:bg-rose-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 2: Career Path Progression Editor */}
      <Card>
        <CardHeader className="p-6 pb-4 border-b border-slate-100 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold text-slate-900 flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span>Career Path Next Roles</span>
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 mt-0.5">
              Valid promotion destinations mapped in the organizational succession graph.
            </CardDescription>
          </div>
          <Button size="sm" variant="outline" onClick={() => setStepDialogOpen(true)} className="text-xs">
            <Plus className="w-3.5 h-3.5 mr-1" />
            Add Next Role
          </Button>
        </CardHeader>
        <CardContent className="p-6">
          {nextRoles.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center italic">
              No progression transitions configured. Add next roles to enable career readiness pathways.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {nextRoles.map((step: any) => (
                <div
                  key={step.id || step.to_role}
                  className="p-4 rounded-lg border border-slate-200 bg-white hover:border-indigo-300 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-1">
                    <span className="text-[10px] font-semibold text-indigo-600 uppercase tracking-wider block">
                      Target Role
                    </span>
                    <h4 className="text-sm font-bold text-slate-900">{step.to_role_title}</h4>
                    <p className="text-xs text-slate-500">
                      Track: {step.to_role_track} · Level {step.to_role_level}
                    </p>
                    <p className="text-[11px] text-slate-500 pt-1 flex items-center">
                      <Clock className="w-3 h-3 mr-1 text-slate-400" />
                      Typical tenure: {step.typical_duration_months || 24} months
                    </p>
                  </div>
                  <div className="pt-3 border-t border-slate-100 mt-3 flex justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeStepMutation.mutate(step.to_role)}
                      className="h-7 text-xs text-rose-600 hover:bg-rose-50"
                    >
                      <Trash2 className="w-3 h-3 mr-1" />
                      Remove Step
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 3: Employees in this Role */}
      <Card>
        <CardHeader className="p-6 pb-4 border-b border-slate-100">
          <CardTitle className="text-base font-semibold text-slate-900 flex items-center space-x-2">
            <Users className="w-4 h-4 text-blue-600" />
            <span>Employees Currently in this Role ({employeesList.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {employeesList.length === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center italic">
              No employees currently assigned to this role.
            </p>
          ) : (
            <div className="divide-y divide-slate-100">
              {employeesList.map((emp) => (
                <div key={emp.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-3">
                    <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-700 font-semibold flex items-center justify-center text-xs">
                      {emp.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                    </div>
                    <div>
                      <Link href={`/hr/employees/${emp.id}`} className="font-semibold text-slate-900 hover:text-indigo-600">
                        {emp.name}
                      </Link>
                      <span className="text-[10px] text-slate-400 block font-mono">{emp.employee_code}</span>
                    </div>
                  </div>
                  <span className="text-slate-500">{emp.department?.name || "General"}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Skill Dialog */}
      <Dialog open={skillDialogOpen} onOpenChange={setSkillDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Skill Requirement</DialogTitle>
            <DialogDescription>
              Set the required level and evaluation weight for {role.title}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Select Competency / Skill *</label>
              <select
                value={selectedSkillId}
                onChange={(e) => setSelectedSkillId(e.target.value)}
                className="w-full h-9 px-3 rounded-md border border-slate-300 bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600"
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
                <label className="text-xs font-semibold text-slate-700">Required Level (1-5) *</label>
                <select
                  value={requiredLevel}
                  onChange={(e) => setRequiredLevel(Number(e.target.value))}
                  className="w-full h-9 px-3 rounded-md border border-slate-300 bg-white text-xs text-slate-800"
                >
                  <option value={1}>Level 1 (Foundational)</option>
                  <option value={2}>Level 2 (Working Knowledge)</option>
                  <option value={3}>Level 3 (Proficient)</option>
                  <option value={4}>Level 4 (Advanced)</option>
                  <option value={5}>Level 5 (Expert / Master)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Importance Weight (1-5)</label>
                <select
                  value={weight}
                  onChange={(e) => setWeight(Number(e.target.value))}
                  className="w-full h-9 px-3 rounded-md border border-slate-300 bg-white text-xs text-slate-800"
                >
                  <option value={1}>1 (Low)</option>
                  <option value={2}>2 (Moderate)</option>
                  <option value={3}>3 (Standard)</option>
                  <option value={4}>4 (High)</option>
                  <option value={5}>5 (Critical)</option>
                </select>
              </div>
            </div>

            <label className="flex items-center space-x-2 text-xs text-slate-700 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={isMustHave}
                onChange={(e) => setIsMustHave(e.target.checked)}
                className="rounded text-indigo-600"
              />
              <span className="font-semibold text-slate-900">Must-Have Gate (Disqualifies readiness if unmet)</span>
            </label>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSkillDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!selectedSkillId || addSkillMutation.isPending}
              onClick={() =>
                addSkillMutation.mutate({
                  skill: selectedSkillId,
                  required_level: requiredLevel,
                  weight,
                  is_must_have: isMustHave,
                })
              }
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              Save Requirement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Career Step Dialog */}
      <Dialog open={stepDialogOpen} onOpenChange={setStepDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Career Step Transition</DialogTitle>
            <DialogDescription>
              Map a valid promotion or horizontal transition from {role.title}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Select Target Role *</label>
              <select
                value={targetRoleId}
                onChange={(e) => setTargetRoleId(e.target.value)}
                className="w-full h-9 px-3 rounded-md border border-slate-300 bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600"
              >
                <option value="">Choose a role...</option>
                {allRoles
                  ?.filter((r: JobRole) => r.id !== role.id)
                  .map((r: JobRole) => (
                    <option key={r.id} value={r.id}>
                      {r.title} ({r.track} - L{r.level})
                    </option>
                  ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Typical Tenure (Months)</label>
              <Input
                type="number"
                value={durationMonths}
                onChange={(e) => setDurationMonths(Number(e.target.value))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setStepDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!targetRoleId || addStepMutation.isPending}
              onClick={() =>
                addStepMutation.mutate({
                  to_role: targetRoleId,
                  typical_duration_months: durationMonths,
                })
              }
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              Add Step
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
