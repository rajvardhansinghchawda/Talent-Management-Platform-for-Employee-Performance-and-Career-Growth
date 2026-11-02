"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock, Key, ArrowLeft, CheckCircle2, Save } from "lucide-react";
import { api } from "@/lib/api/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ChangePasswordPage() {
  const router = useRouter();

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    setLoading(true);

    try {
      await api.auth.changePassword({
        old_password: oldPassword,
        new_password: newPassword,
      });
      setSuccess(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to change password. Please check your current password.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Card className="border-slate-200 shadow-sm">
          {success ? (
            <CardContent className="p-8 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <CardTitle className="text-base font-bold text-slate-900">Password Changed Successfully</CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Your password has been updated across all portals.
              </CardDescription>
              <div className="pt-4">
                <Button onClick={() => router.back()} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs">
                  Return to Dashboard
                </Button>
              </div>
            </CardContent>
          ) : (
            <>
              <CardHeader className="p-6 pb-4 border-b border-slate-100">
                <CardTitle className="text-base font-semibold text-slate-900 flex items-center space-x-2">
                  <Key className="w-4 h-4 text-indigo-600" />
                  <span>Change Password</span>
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Update your authentication credentials
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-4 text-xs">
                {error && (
                  <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 font-medium">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="font-semibold text-slate-700 block">Current Password *</label>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      value={oldPassword}
                      onChange={(e) => setOldPassword(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-semibold text-slate-700 block">New Password *</label>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-semibold text-slate-700 block">Confirm New Password *</label>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                  </div>

                  <div className="flex justify-between items-center pt-2">
                    <Button variant="ghost" type="button" size="sm" onClick={() => router.back()}>
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={loading || !oldPassword || !newPassword}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white"
                    >
                      {loading ? "Updating..." : "Update Password"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
