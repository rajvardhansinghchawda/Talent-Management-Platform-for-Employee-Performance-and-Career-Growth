"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  User,
  Building2,
  Briefcase,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Edit2,
  Key,
  CheckCircle2,
  Save,
} from "lucide-react";
import { api, fetchApi } from "@/lib/api/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusChip } from "@/components/shared/StatusChip";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { formatDate } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function EmployeeProfilePage() {
  const queryClient = useQueryClient();

  // Edit dialog state
  const [editOpen, setEditOpen] = useState(false);
  const [preferredName, setPreferredName] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [bio, setBio] = useState("");

  // Change password dialog state
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Query profile
  const {
    data: profile,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["employee-self-profile"],
    queryFn: () => fetchApi<any>("/employees/me/"),
  });

  const updateMutation = useMutation({
    mutationFn: () =>
      fetchApi("/employees/me/", {
        method: "PATCH",
        body: JSON.stringify({
          preferred_name: preferredName,
          phone,
          location,
          bio,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee-self-profile"] });
      setEditOpen(false);
    },
  });

  const passwordMutation = useMutation({
    mutationFn: () =>
      api.auth.changePassword({
        old_password: oldPassword,
        new_password: newPassword,
      }),
    onSuccess: () => {
      setPasswordSuccess(true);
      setOldPassword("");
      setNewPassword("");
      setPasswordError(null);
    },
    onError: (err: any) => {
      setPasswordError(err.message || "Failed to update password.");
    },
  });

  const openEditModal = () => {
    if (profile) {
      setPreferredName(profile.preferred_name || "");
      setPhone(profile.phone || "");
      setLocation(profile.location || "");
      setBio(profile.bio || "");
      setEditOpen(true);
    }
  };

  if (isLoading) return <LoadingState rows={6} />;
  if (error || !profile) {
    return (
      <ErrorState
        message={error instanceof Error ? error.message : "Failed to load profile."}
        onRetry={() => refetch()}
      />
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">My Profile</h1>
        <p className="text-sm text-slate-500 mt-1">
          Personal contact information, employment attributes, and account security.
        </p>
      </div>

      {/* Profile Card */}
      <Card className="border-slate-200">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 rounded-2xl bg-indigo-600 text-white font-bold text-xl flex items-center justify-center shadow-md">
                {(profile.name || "Rahul Sharma")
                  .split(" ")
                  .map((n: string) => n[0])
                  .slice(0, 2)
                  .join("")}
              </div>
              <div className="space-y-1">
                <div className="flex items-center space-x-2.5">
                  <h2 className="text-xl font-bold text-slate-900">
                    {profile.preferred_name ? `${profile.preferred_name} (${profile.name})` : profile.name}
                  </h2>
                  <StatusChip status={profile.employment_status || "ACTIVE"} />
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                  <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">
                    {profile.employee_code}
                  </span>
                  <span>{profile.job_role?.title || profile.job_title || "Junior Software Engineer"}</span>
                  <span>·</span>
                  <span>{profile.department?.name || "Engineering"}</span>
                </div>
              </div>
            </div>

            <Button onClick={openEditModal} size="sm" variant="outline" className="text-xs">
              <Edit2 className="w-3.5 h-3.5 mr-1.5" />
              Edit Personal Info
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Employment Details Section */}
      <Card>
        <CardHeader className="p-6 pb-4 border-b border-slate-100">
          <CardTitle className="text-base font-semibold text-slate-900">Employment Record</CardTitle>
          <CardDescription className="text-xs text-slate-500">
            Official organization attributes managed by HR
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-xs">
            <div>
              <dt className="text-slate-400 font-medium">Employee Code</dt>
              <dd className="font-mono font-semibold text-slate-900 mt-1">{profile.employee_code}</dd>
            </div>
            <div>
              <dt className="text-slate-400 font-medium">Department</dt>
              <dd className="font-semibold text-slate-900 mt-1">{profile.department?.name || "Engineering"}</dd>
            </div>
            <div>
              <dt className="text-slate-400 font-medium">Designation / Role</dt>
              <dd className="font-semibold text-slate-900 mt-1">{profile.job_role?.title || "Junior Software Engineer"}</dd>
            </div>
            <div>
              <dt className="text-slate-400 font-medium">Reporting Manager</dt>
              <dd className="font-semibold text-slate-900 mt-1">{profile.manager?.name || "Vikram Malhotra"}</dd>
            </div>
            <div>
              <dt className="text-slate-400 font-medium">Joining Date</dt>
              <dd className="font-semibold text-slate-900 mt-1">{formatDate(profile.joining_date)}</dd>
            </div>
            <div>
              <dt className="text-slate-400 font-medium">Office Location</dt>
              <dd className="font-semibold text-slate-900 mt-1">{profile.location || "Bengaluru HQ"}</dd>
            </div>
            <div>
              <dt className="text-slate-400 font-medium">Contact Phone</dt>
              <dd className="font-semibold text-slate-900 mt-1">{profile.phone || "+91 98765 43210"}</dd>
            </div>
            <div>
              <dt className="text-slate-400 font-medium">Professional Bio</dt>
              <dd className="text-slate-700 mt-1">{profile.bio || "Backend engineer passionate about high-throughput APIs, PostgreSQL, and clean architecture."}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {/* Account Security Card */}
      <Card>
        <CardHeader className="p-6 pb-4 border-b border-slate-100 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold text-slate-900">Account & Security</CardTitle>
            <CardDescription className="text-xs text-slate-500 mt-0.5">
              Login credentials and password security settings
            </CardDescription>
          </div>
          <Button onClick={() => setPasswordOpen(true)} size="sm" variant="outline" className="text-xs">
            <Key className="w-3.5 h-3.5 mr-1.5" />
            Change Password
          </Button>
        </CardHeader>
        <CardContent className="p-6 text-xs text-slate-600">
          <p>
            Your account is authenticated via company single session. Passwords must be at least 8 characters with upper, lower, and numeric requirements.
          </p>
        </CardContent>
      </Card>

      {/* Edit Personal Info Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Personal Information</DialogTitle>
            <DialogDescription>
              Update your contact preferences and directory bio.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700 block">Preferred Name</label>
              <Input value={preferredName} onChange={(e) => setPreferredName(e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700 block">Phone Number</label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700 block">Location</label>
              <Input value={location} onChange={(e) => setLocation(e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700 block">Bio</label>
              <textarea
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full rounded-md border border-slate-300 p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
              disabled={updateMutation.isPending}
              onClick={() => updateMutation.mutate()}
            >
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Password Dialog */}
      <Dialog open={passwordOpen} onOpenChange={setPasswordOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>
              Enter your current password and your new secure password.
            </DialogDescription>
          </DialogHeader>

          {passwordSuccess ? (
            <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center space-x-2 my-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>Password updated successfully!</span>
            </div>
          ) : (
            <div className="space-y-4 py-2 text-xs">
              {passwordError && (
                <div className="p-2.5 rounded bg-red-50 border border-red-200 text-red-700">
                  {passwordError}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700 block">Current Password *</label>
                <Input
                  type="password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700 block">New Password *</label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setPasswordOpen(false)}>
              {passwordSuccess ? "Done" : "Cancel"}
            </Button>
            {!passwordSuccess && (
              <Button
                disabled={!oldPassword || !newPassword || passwordMutation.isPending}
                onClick={() => passwordMutation.mutate()}
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                {passwordMutation.isPending ? "Updating..." : "Update Password"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
