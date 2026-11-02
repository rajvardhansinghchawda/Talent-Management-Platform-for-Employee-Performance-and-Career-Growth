"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { UserPlus, ArrowLeft, Key, CheckCircle2, Copy } from "lucide-react";
import { api } from "@/lib/api/client";
import type { Department, Employee, JobRole } from "@/lib/api/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function AddEmployeePage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  // Form state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("EMPLOYEE");
  const [credentialMode, setCredentialMode] = useState<"INVITE" | "TEMP_PASSWORD">("TEMP_PASSWORD");

  const [employeeCode, setEmployeeCode] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [jobRoleId, setJobRoleId] = useState("");
  const [managerId, setManagerId] = useState("");
  const [joiningDate, setJoiningDate] = useState(new Date().toISOString().split("T")[0]);

  const [preferredName, setPreferredName] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");

  const [formError, setFormError] = useState<string | null>(null);
  const [tempPasswordCreated, setTempPasswordCreated] = useState<string | null>(null);
  const [createdEmpName, setCreatedEmpName] = useState("");

  // Queries for selectors
  const { data: departments } = useQuery({
    queryKey: ["departments"],
    queryFn: () => api.departments.list(),
  });

  const { data: jobRoles } = useQuery({
    queryKey: ["job-roles"],
    queryFn: () => api.jobRoles.list(),
  });

  const { data: managerCandidates } = useQuery({
    queryKey: ["manager-candidates"],
    queryFn: () => api.employees.list({ status: "ACTIVE" }),
  });

  const managers: Employee[] = Array.isArray(managerCandidates)
    ? managerCandidates
    : managerCandidates?.results || [];

  const roles: JobRole[] = Array.isArray(jobRoles) ? jobRoles : [];

  const createMutation = useMutation({
    mutationFn: (payload: any) => api.employees.create(payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.invalidateQueries({ queryKey: ["hr-dashboard"] });
      if (data.temporary_password) {
        setTempPasswordCreated(data.temporary_password);
        setCreatedEmpName(data.employee.name);
      } else {
        router.push("/hr/employees");
      }
    },
    onError: (err: any) => {
      setFormError(err.message || "Failed to create employee.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!email || !employeeCode || !firstName) {
      setFormError("First Name, Email, and Employee Code are required.");
      return;
    }

    createMutation.mutate({
      email,
      role,
      credential_mode: credentialMode,
      first_name: firstName,
      last_name: lastName,
      employee: {
        employee_code: employeeCode,
        first_name: firstName,
        last_name: lastName,
        department: departmentId || null,
        job_role: jobRoleId || null,
        manager: managerId || null,
        joining_date: joiningDate,
        preferred_name: preferredName || firstName,
        phone: phone || undefined,
        location: location || undefined,
      },
    });
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <Link href="/hr/employees">
          <Button variant="ghost" size="sm" className="h-8 px-2 text-slate-500 hover:text-slate-900">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Add New Employee</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Atomically creates user authentication credentials and employee profile record.
          </p>
        </div>
      </div>

      {formError && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
          {formError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Account & Credentials */}
        <Card>
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-sm font-semibold text-slate-900">1. Account & Access Credentials</CardTitle>
            <CardDescription className="text-xs text-slate-500">
              User login credentials and portal RBAC role
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">First Name *</label>
              <Input
                placeholder="e.g. Rahul"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Last Name</label>
              <Input
                placeholder="e.g. Sharma"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Company Email Address *</label>
              <Input
                type="email"
                placeholder="e.g. employee@acme.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700">System Role *</label>
                <span className="text-[10px] text-slate-400">Portal Access Level</span>
              </div>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full h-9 px-3 rounded-md border border-slate-300 bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600"
              >
                <option value="EMPLOYEE">Employee (Individual Contributor)</option>
                <option value="MANAGER">Manager (People Leader)</option>
                <option value="HR_ADMIN">HR Administrator (HR Team Member)</option>
                <option value="EXECUTIVE">Executive (Leadership & Succession)</option>
              </select>
              <p className="text-[10px] text-slate-400 mt-1">
                Select &#39;Employee&#39; for standard team members, or &#39;HR Administrator&#39; only if onboarding an HR team colleague.
              </p>
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs font-semibold text-slate-700">Credential Onboarding Mode *</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
                <label
                  className={`p-3 rounded-lg border text-xs cursor-pointer flex items-start space-x-2.5 transition-all ${
                    credentialMode === "TEMP_PASSWORD"
                      ? "border-indigo-600 bg-indigo-50/40 text-indigo-950 font-medium"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <input
                    type="radio"
                    name="credential_mode"
                    value="TEMP_PASSWORD"
                    checked={credentialMode === "TEMP_PASSWORD"}
                    onChange={() => setCredentialMode("TEMP_PASSWORD")}
                    className="mt-0.5 text-indigo-600"
                  />
                  <div>
                    <span className="font-semibold block text-slate-900">Generate Temporary Password</span>
                    <span className="text-[11px] text-slate-500">
                      Returns a one-time random password and requires password reset on initial login.
                    </span>
                  </div>
                </label>

                <label
                  className={`p-3 rounded-lg border text-xs cursor-pointer flex items-start space-x-2.5 transition-all ${
                    credentialMode === "INVITE"
                      ? "border-indigo-600 bg-indigo-50/40 text-indigo-950 font-medium"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <input
                    type="radio"
                    name="credential_mode"
                    value="INVITE"
                    checked={credentialMode === "INVITE"}
                    onChange={() => setCredentialMode("INVITE")}
                    className="mt-0.5 text-indigo-600"
                  />
                  <div>
                    <span className="font-semibold block text-slate-900">Send Email Invitation Link</span>
                    <span className="text-[11px] text-slate-500">
                      Emails employee a secure, time-limited activation and set-password link.
                    </span>
                  </div>
                </label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 2: Employment Details */}
        <Card>
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-sm font-semibold text-slate-900">2. Employment & Hierarchy Details</CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Department mapping, job role, and manager assignment
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Employee Code *</label>
              <Input
                placeholder="e.g. EMP004"
                value={employeeCode}
                onChange={(e) => setEmployeeCode(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Department</label>
              <select
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                className="w-full h-9 px-3 rounded-md border border-slate-300 bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600"
              >
                <option value="">Select department...</option>
                {departments?.map((d: Department) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Job Role / Level</label>
              <select
                value={jobRoleId}
                onChange={(e) => setJobRoleId(e.target.value)}
                className="w-full h-9 px-3 rounded-md border border-slate-300 bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600"
              >
                <option value="">Select job role...</option>
                {roles.map((r: JobRole) => (
                  <option key={r.id} value={r.id}>
                    {r.title} ({r.track} - L{r.level})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Reporting Manager</label>
              <select
                value={managerId}
                onChange={(e) => setManagerId(e.target.value)}
                className="w-full h-9 px-3 rounded-md border border-slate-300 bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600"
              >
                <option value="">None (Reports to Root / Executive)</option>
                {managers.map((m: Employee) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.employee_code} - {m.job_title || "Lead"})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Joining Date</label>
              <Input
                type="date"
                value={joiningDate}
                onChange={(e) => setJoiningDate(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Section 3: Personal Profile Details */}
        <Card>
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-sm font-semibold text-slate-900">3. Profile & Contact Information</CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Optional directory and contact information
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Preferred Name</label>
              <Input
                placeholder="e.g. Alex"
                value={preferredName}
                onChange={(e) => setPreferredName(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Phone Number</label>
              <Input
                placeholder="+1 (555) 000-0000"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Location / Office</label>
              <Input
                placeholder="San Francisco, CA"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Footer Actions */}
        <div className="flex items-center justify-end space-x-3 pt-2">
          <Link href="/hr/employees">
            <Button variant="outline" type="button">
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? "Creating..." : "Create Employee"}
          </Button>
        </div>
      </form>

      {/* Temporary Password Dialog Modal */}
      {tempPasswordCreated && (
        <Dialog open={!!tempPasswordCreated} onOpenChange={() => router.push("/hr/employees")}>
          <DialogContent>
            <DialogHeader>
              <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-2">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <DialogTitle>Employee Created Successfully!</DialogTitle>
              <DialogDescription>
                A temporary password was generated for <strong>{createdEmpName}</strong>. Copy it immediately as it will not be displayed again.
              </DialogDescription>
            </DialogHeader>

            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 my-3 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-semibold text-slate-400 block tracking-wider">
                  Temporary Password
                </span>
                <span className="font-mono text-base font-bold text-slate-900 tracking-wider">
                  {tempPasswordCreated}
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(tempPasswordCreated);
                }}
              >
                <Copy className="w-3.5 h-3.5 mr-1" />
                Copy
              </Button>
            </div>

            <DialogFooter>
              <Button onClick={() => router.push("/hr/employees")}>Done & Return to Employees</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
