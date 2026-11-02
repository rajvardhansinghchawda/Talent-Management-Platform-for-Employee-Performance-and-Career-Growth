"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Sparkles, Mail, ArrowLeft, CheckCircle2, Send } from "lucide-react";
import { fetchApi } from "@/lib/api/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await fetchApi("/auth/password/reset/", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setSubmitted(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to send reset link.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/75 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold mx-auto shadow-md shadow-indigo-200">
          <Sparkles className="w-6 h-6" />
        </div>
        <h2 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">Reset Your Password</h2>
        <p className="mt-1 text-xs text-slate-500">
          Enter your registered work email to receive password reset instructions.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <Card className="border-slate-200 shadow-md">
          {submitted ? (
            <CardContent className="p-8 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Check Your Inbox</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                If an account exists for <strong>{email}</strong>, you will receive an email containing a secure password reset link shortly.
              </p>
              <div className="pt-4">
                <Link href="/login">
                  <Button variant="outline" size="sm" className="w-full text-xs">
                    Return to Sign In
                  </Button>
                </Link>
              </div>
            </CardContent>
          ) : (
            <>
              <CardHeader className="p-6 pb-4 border-b border-slate-100">
                <CardTitle className="text-base font-semibold text-slate-900">Password Recovery</CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  We will send a temporary reset token to your inbox
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
                    <label className="font-semibold text-slate-700 block">Work Email Address</label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <Input
                        type="email"
                        placeholder="name@company.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="pl-9 h-9 text-xs"
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={loading || !email}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs h-9"
                  >
                    <Send className="w-3.5 h-3.5 mr-1.5" />
                    {loading ? "Sending link..." : "Send Reset Link"}
                  </Button>
                </form>

                <div className="pt-2 text-center">
                  <Link href="/login" className="text-xs font-medium text-indigo-600 hover:underline flex items-center justify-center">
                    <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                    Back to Sign In
                  </Link>
                </div>
              </CardContent>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
