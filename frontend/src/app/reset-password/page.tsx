"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Sparkles, Lock, ArrowRight, CheckCircle2 } from "lucide-react";
import { fetchApi } from "@/lib/api/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    setLoading(true);

    try {
      await fetchApi("/auth/password/reset/confirm/", {
        method: "POST",
        body: JSON.stringify({
          token,
          new_password: newPassword,
        }),
      });
      setSuccess(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to reset password. Token may be invalid or expired.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-slate-200 shadow-md">
      {success ? (
        <CardContent className="p-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">Password Reset Successfully</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Your new password has been set. You can now sign in to your portal.
          </p>
          <div className="pt-4">
            <Link href="/login">
              <Button size="sm" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs">
                Continue to Sign In
              </Button>
            </Link>
          </div>
        </CardContent>
      ) : (
        <>
          <CardHeader className="p-6 pb-4 border-b border-slate-100">
            <CardTitle className="text-base font-semibold text-slate-900">Set New Password</CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Enter your new secure password below
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-5 text-xs">
            {error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700 block">New Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    className="pl-9 h-9 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700 block">Confirm New Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="pl-9 h-9 text-xs font-mono"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading || !newPassword}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs h-9"
              >
                {loading ? "Updating..." : "Reset Password"}
                <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </Button>
            </form>
          </CardContent>
        </>
      )}
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-slate-50/75 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold mx-auto shadow-md shadow-indigo-200">
          <Sparkles className="w-6 h-6" />
        </div>
        <h2 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">Choose a New Password</h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">Loading reset token...</div>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
