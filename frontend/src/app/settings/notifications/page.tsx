"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, ArrowLeft, Mail, Smartphone, Save, CheckCircle2 } from "lucide-react";
import { fetchApi } from "@/lib/api/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";

interface PreferenceItem {
  category: string;
  category_label: string;
  email_enabled: boolean;
  in_app_enabled: boolean;
}

export default function NotificationSettingsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [savedSuccess, setSavedSuccess] = useState(false);
  const [localPrefs, setLocalPrefs] = useState<PreferenceItem[]>([]);

  const {
    data: preferences,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["notification-preferences"],
    queryFn: async () => {
      const data = await fetchApi<PreferenceItem[]>("/notifications/preferences/");
      setLocalPrefs(data);
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: (updated: PreferenceItem[]) =>
      fetchApi<PreferenceItem[]>("/notifications/preferences/", {
        method: "PATCH",
        body: JSON.stringify({ preferences: updated }),
      }),
    onSuccess: (data: PreferenceItem[]) => {
      queryClient.setQueryData(["notification-preferences"], data);
      setLocalPrefs(data);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    },
  });

  const handleToggle = (category: string, channel: "email" | "in_app") => {
    setLocalPrefs((prev) =>
      prev.map((p) => {
        if (p.category === category) {
          return {
            ...p,
            email_enabled: channel === "email" ? !p.email_enabled : p.email_enabled,
            in_app_enabled: channel === "in_app" ? !p.in_app_enabled : p.in_app_enabled,
          };
        }
        return p;
      })
    );
  };

  if (isLoading) return <LoadingState rows={6} />;
  if (error) {
    return (
      <ErrorState
        message={error instanceof Error ? error.message : "Failed to load preferences."}
        onRetry={() => refetch()}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Navigation & Header */}
        <div className="flex items-center space-x-3">
          <Button variant="ghost" size="sm" onClick={() => router.back()} className="h-8 px-2 text-slate-500 hover:text-slate-900">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Notification Preferences</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Customize how and when you receive activity alerts and email notifications.
            </p>
          </div>
        </div>

        {savedSuccess && (
          <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Notification preferences updated successfully!</span>
          </div>
        )}

        <Card>
          <CardHeader className="p-6 pb-4 border-b border-slate-100 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold text-slate-900">Delivery Channels & Categories</CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Configure email digests and in-app alerts per notification category
              </CardDescription>
            </div>
            <div className="flex items-center space-x-6 text-xs font-semibold text-slate-500">
              <span className="flex items-center"><Mail className="w-3.5 h-3.5 mr-1" /> Email</span>
              <span className="flex items-center"><Bell className="w-3.5 h-3.5 mr-1" /> In-App</span>
            </div>
          </CardHeader>
          <CardContent className="p-6 divide-y divide-slate-100 text-xs">
            {localPrefs.map((pref) => (
              <div key={pref.category} className="py-4 first:pt-0 last:pb-0 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-900 block">{pref.category_label}</span>
                  <span className="text-[11px] text-slate-500">
                    Receive updates for {pref.category_label.toLowerCase()} actions and deadlines.
                  </span>
                </div>

                <div className="flex items-center space-x-8">
                  {/* Email Toggle */}
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={pref.email_enabled}
                      onChange={() => handleToggle(pref.category, "email")}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>

                  {/* In-App Toggle */}
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={pref.in_app_enabled}
                      onChange={() => handleToggle(pref.category, "in_app")}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="flex justify-end space-x-3">
          <Button variant="outline" size="sm" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button
            size="sm"
            disabled={saveMutation.isPending}
            onClick={() => saveMutation.mutate(localPrefs)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs"
          >
            <Save className="w-3.5 h-3.5 mr-1.5" />
            {saveMutation.isPending ? "Saving..." : "Save Preferences"}
          </Button>
        </div>
      </div>
    </div>
  );
}
