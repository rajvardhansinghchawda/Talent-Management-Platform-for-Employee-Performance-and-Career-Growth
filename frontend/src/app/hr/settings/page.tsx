"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Settings,
  Building,
  Target,
  Briefcase,
  ShieldAlert,
  Users,
  Save,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Bell,
  Mail,
  SlidersHorizontal,
} from "lucide-react";
import { api, fetchApi } from "@/lib/api/client";
import type { OrganizationSettings, User } from "@/lib/api/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";

export default function SettingsPage() {
  const queryClient = useQueryClient();

  // Queries
  const {
    data: settingsData,
    isLoading: settingsLoading,
    error: settingsError,
    refetch: refetchSettings,
  } = useQuery({
    queryKey: ["org-settings"],
    queryFn: () => api.settings.get(),
  });

  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ["users-list"],
    queryFn: () => api.settings.listUsers(),
  });

  // Settings State Form
  const [orgName, setOrgName] = useState("Acme Corporation");
  const [goalCap, setGoalCap] = useState("1.20");
  const [requireGoalApproval, setRequireGoalApproval] = useState(true);
  const [provisionalSkills, setProvisionalSkills] = useState(true);
  const [confidentialFeedback, setConfidentialFeedback] = useState(true);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [alertPrefs, setAlertPrefs] = useState<
    Array<{
      category: string;
      category_label: string;
      email_enabled: boolean;
      in_app_enabled: boolean;
    }>
  >([]);
  const [alertPrefSaved, setAlertPrefSaved] = useState(false);

  const { data: prefData } = useQuery({
    queryKey: ["hr-alert-preferences"],
    queryFn: async () => {
      const data = await fetchApi<
        Array<{
          category: string;
          category_label: string;
          email_enabled: boolean;
          in_app_enabled: boolean;
        }>
      >("/notifications/preferences/");
      setAlertPrefs(data);
      return data;
    },
  });

  const saveAlertPrefMutation = useMutation({
    mutationFn: (
      updated: Array<{
        category: string;
        category_label: string;
        email_enabled: boolean;
        in_app_enabled: boolean;
      }>
    ) =>
      fetchApi("/notifications/preferences/", {
        method: "PATCH",
        body: JSON.stringify({ preferences: updated }),
      }),
    onSuccess: (data: any) => {
      queryClient.setQueryData(["hr-alert-preferences"], data);
      if (Array.isArray(data)) setAlertPrefs(data);
      setAlertPrefSaved(true);
      setTimeout(() => setAlertPrefSaved(false), 3000);
    },
  });
  React.useEffect(() => {
    if (settingsData) {
      if (settingsData.general?.name) setOrgName(settingsData.general.name);
      if (settingsData.performance?.goal_score_cap) setGoalCap(String(settingsData.performance.goal_score_cap));
      if (settingsData.performance?.require_goal_approval !== undefined) {
        setRequireGoalApproval(settingsData.performance.require_goal_approval);
      }
      if (settingsData.career?.self_assessments_provisional !== undefined) {
        setProvisionalSkills(settingsData.career.self_assessments_provisional);
      }
      if (settingsData.privacy?.confidential_feedback !== undefined) {
        setConfidentialFeedback(settingsData.privacy.confidential_feedback);
      }
    }
  }, [settingsData]);

  // Mutations
  const updateSettingsMutation = useMutation({
    mutationFn: (group: string) => {
      let values = {};
      if (group === "general") values = { name: orgName };
      if (group === "performance") values = { goal_score_cap: goalCap, require_goal_approval: requireGoalApproval };
      if (group === "career") values = { self_assessments_provisional: provisionalSkills };
      if (group === "privacy") values = { confidential_feedback: confidentialFeedback };

      return api.settings.updateGroup(group, values);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["org-settings"] });
      setStatusMsg("Settings saved successfully.");
      setTimeout(() => setStatusMsg(null), 3000);
    },
  });

  if (settingsLoading) return <LoadingState rows={8} />;
  if (settingsError) {
    return <ErrorState message="Failed to load organization settings." onRetry={() => refetchSettings()} />;
  }

  const users: User[] = Array.isArray(usersData) ? usersData : (usersData as any)?.results || [];
  const hrAdminsCount = users.filter((u) => u.role === "HR_ADMIN" && u.is_active).length;

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Organization Settings</h1>
          <p className="text-sm text-slate-500 mt-1">
            Global policies, performance caps, rating scale configuration, and administrator security guards.
          </p>
        </div>
      </div>

      {statusMsg && (
        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-medium flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{statusMsg}</span>
        </div>
      )}

      {/* 1. Organization Branding Section */}
      <Card>
        <CardHeader className="p-6 pb-4 border-b border-slate-100 flex flex-row items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <Building className="w-5 h-5 text-indigo-600" />
            <div>
              <CardTitle className="text-sm font-bold text-slate-900">Organization Profile</CardTitle>
              <CardDescription className="text-xs text-slate-500">Legal company name and timezone</CardDescription>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => updateSettingsMutation.mutate("general")}
            disabled={updateSettingsMutation.isPending}
            className="text-xs"
          >
            <Save className="w-3.5 h-3.5 mr-1" />
            Save Profile
          </Button>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Organization Name</label>
              <Input value={orgName} onChange={(e) => setOrgName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Timezone</label>
              <Input value="UTC (Coordinated Universal Time)" disabled className="bg-slate-50" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. Performance & Scoring Rules */}
      <Card>
        <CardHeader className="p-6 pb-4 border-b border-slate-100 flex flex-row items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <Target className="w-5 h-5 text-indigo-600" />
            <div>
              <CardTitle className="text-sm font-bold text-slate-900">Performance & Goal Rules</CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Score caps, 5-point rating rubric anchors, and approval workflows
              </CardDescription>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => updateSettingsMutation.mutate("performance")}
            disabled={updateSettingsMutation.isPending}
            className="text-xs"
          >
            <Save className="w-3.5 h-3.5 mr-1" />
            Save Rules
          </Button>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Maximum Goal Score Cap (1.0 to 1.5)</label>
              <Input
                type="number"
                step="0.05"
                min="1.0"
                max="1.5"
                value={goalCap}
                onChange={(e) => setGoalCap(e.target.value)}
              />
              <span className="text-[11px] text-slate-500 block">
                Caps maximum weighted goal performance payout ratio.
              </span>
            </div>

            <div className="space-y-2 pt-2">
              <label className="flex items-center space-x-2 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={requireGoalApproval}
                  onChange={(e) => setRequireGoalApproval(e.target.checked)}
                  className="rounded text-indigo-600"
                />
                <span className="font-semibold text-slate-900">Require Manager Approval for Goals</span>
              </label>
              <p className="text-[11px] text-slate-500 pl-6">
                Employee-created goals must be approved before progress updates can be logged.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. Career & Competency Settings */}
      <Card>
        <CardHeader className="p-6 pb-4 border-b border-slate-100 flex flex-row items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <Briefcase className="w-5 h-5 text-indigo-600" />
            <div>
              <CardTitle className="text-sm font-bold text-slate-900">Career & Readiness Gates</CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Explainable readiness thresholds and provisional skill governance
              </CardDescription>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => updateSettingsMutation.mutate("career")}
            disabled={updateSettingsMutation.isPending}
            className="text-xs"
          >
            <Save className="w-3.5 h-3.5 mr-1" />
            Save Gates
          </Button>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/50 space-y-2">
            <label className="flex items-center space-x-2 text-xs text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={provisionalSkills}
                onChange={(e) => setProvisionalSkills(e.target.checked)}
                className="rounded text-indigo-600"
              />
              <span className="font-semibold text-slate-900">
                Treat Self-Assessments as Provisional (Domain Rule)
              </span>
            </label>
            <p className="text-[11px] text-slate-500 pl-6 leading-relaxed">
              When checked, gap analysis and career readiness algorithms use <strong>validated levels only</strong>. Self-reported proficiencies appear marked as provisional until manager confirmation.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 4. Privacy & Confidential Feedback */}
      <Card>
        <CardHeader className="p-6 pb-4 border-b border-slate-100 flex flex-row items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <ShieldAlert className="w-5 h-5 text-indigo-600" />
            <div>
              <CardTitle className="text-sm font-bold text-slate-900">Privacy & Data Governance</CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Confidential feedback isolation and audit retention
              </CardDescription>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => updateSettingsMutation.mutate("privacy")}
            disabled={updateSettingsMutation.isPending}
            className="text-xs"
          >
            <Save className="w-3.5 h-3.5 mr-1" />
            Save Privacy
          </Button>
        </CardHeader>
        <CardContent className="p-6">
          <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/50 space-y-2">
            <label className="flex items-center space-x-2 text-xs text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={confidentialFeedback}
                onChange={(e) => setConfidentialFeedback(e.target.checked)}
                className="rounded text-indigo-600"
              />
              <span className="font-semibold text-slate-900">
                Enforce Confidential Manager Notes Isolation
              </span>
            </label>
            <p className="text-[11px] text-slate-500 pl-6 leading-relaxed">
              Confidential feedback is stripped at the DRF serializer level and never transmitted to employee portal clients.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Alert & Notification Preferences */}
      <Card>
        <CardHeader className="p-6 pb-4 border-b border-slate-100 flex flex-row items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <Bell className="w-5 h-5 text-indigo-600" />
            <div>
              <CardTitle className="text-sm font-bold text-slate-900">Alert & Notification Preferences</CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Configure default email alerts and in-app notifications for system events
              </CardDescription>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => saveAlertPrefMutation.mutate(alertPrefs)}
            disabled={saveAlertPrefMutation.isPending}
            className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            <Save className="w-3.5 h-3.5 mr-1" />
            {saveAlertPrefMutation.isPending ? "Saving..." : "Save Preferences"}
          </Button>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          {alertPrefSaved && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Alert preferences saved successfully!</span>
            </div>
          )}

          <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden bg-white text-xs">
            <div className="grid grid-cols-12 bg-slate-50 p-3 font-semibold text-slate-700">
              <div className="col-span-6 sm:col-span-8">Event Category</div>
              <div className="col-span-3 sm:col-span-2 text-center">In-App Alert</div>
              <div className="col-span-3 sm:col-span-2 text-center">Email Alert</div>
            </div>
            {alertPrefs.map((pref) => (
              <div key={pref.category} className="grid grid-cols-12 p-3 items-center hover:bg-slate-50/50 transition-colors">
                <div className="col-span-6 sm:col-span-8">
                  <span className="font-semibold text-slate-900 block">{pref.category_label}</span>
                  <span className="text-[10px] text-slate-400 font-mono">{pref.category}</span>
                </div>
                <div className="col-span-3 sm:col-span-2 flex justify-center">
                  <input
                    type="checkbox"
                    checked={pref.in_app_enabled}
                    onChange={() =>
                      setAlertPrefs((prev) =>
                        prev.map((p) =>
                          p.category === pref.category ? { ...p, in_app_enabled: !p.in_app_enabled } : p
                        )
                      )
                    }
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                </div>
                <div className="col-span-3 sm:col-span-2 flex justify-center">
                  <input
                    type="checkbox"
                    checked={pref.email_enabled}
                    onChange={() =>
                      setAlertPrefs((prev) =>
                        prev.map((p) =>
                          p.category === pref.category ? { ...p, email_enabled: !p.email_enabled } : p
                        )
                      )
                    }
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 5. User Roles & Last HR Admin Guard */}
      <Card>
        <CardHeader className="p-6 pb-4 border-b border-slate-100">
          <div className="flex items-center space-x-2.5">
            <Users className="w-5 h-5 text-indigo-600" />
            <div>
              <CardTitle className="text-sm font-bold text-slate-900">Users & Role Access Control</CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Assigned system roles and Last HR Administrator protection safeguard
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="p-3 rounded-lg bg-indigo-50/60 border border-indigo-100 text-xs text-indigo-900 mb-4 flex items-start space-x-2.5">
            <Lock className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block">Last HR Admin Protection Active</span>
              <span className="text-[11px] text-indigo-700">
                There {hrAdminsCount === 1 ? "is currently 1 active HR Administrator" : `are ${hrAdminsCount} active HR Administrators`}. Demoting or deactivating the last HR Administrator is blocked by backend state conflict invariants.
              </span>
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User Email</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Assigned Role</TableHead>
                  <TableHead>Account Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-mono text-xs font-semibold text-slate-900">{u.email}</TableCell>
                    <TableCell className="text-xs text-slate-700">
                      {u.first_name} {u.last_name}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={u.role === "HR_ADMIN" ? "default" : "secondary"}
                        className="text-[10px] uppercase font-mono"
                      >
                        {u.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={u.is_active ? "success" : "destructive"} className="text-[10px]">
                        {u.is_active ? "Active" : "Deactivated"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
