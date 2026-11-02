"use client";

import React, { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Sparkles, Eye, EyeOff, Lock, Mail, ArrowRight } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, login, loading: authLoading } = useAuth();

  const redirectUrl = searchParams.get("redirect");

  const [email, setEmail] = useState("rahul@acme.com");
  const [password, setPassword] = useState("Password123!");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function isAuthorizedForRoute(role: string, targetPath: string): boolean {
    if (targetPath.startsWith("/hr")) return role === "HR_ADMIN";
    if (targetPath.startsWith("/manager")) return role === "MANAGER" || role === "HR_ADMIN";
    if (targetPath.startsWith("/executive")) return role === "EXECUTIVE" || role === "HR_ADMIN";
    if (targetPath.startsWith("/employee")) return true;
    return true;
  }

  function getDefaultPortal(role: string): string {
    if (role === "HR_ADMIN") return "/hr";
    if (role === "MANAGER") return "/manager";
    if (role === "EXECUTIVE") return "/executive";
    return "/employee";
  }

  // If already authenticated, redirect to authorized portal
  useEffect(() => {
    if (!authLoading && user) {
      if (redirectUrl && isAuthorizedForRoute(user.role, redirectUrl)) {
        router.replace(redirectUrl);
      } else {
        router.replace(getDefaultPortal(user.role));
      }
    }
  }, [user, authLoading, redirectUrl, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const loggedUser = await login(email, password);
      if (redirectUrl && isAuthorizedForRoute(loggedUser.role, redirectUrl)) {
        router.push(redirectUrl);
      } else {
        router.push(getDefaultPortal(loggedUser.role));
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Invalid credentials. Please verify your email and password.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword("Password123!");
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-50/75 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold mx-auto shadow-md shadow-indigo-200">
          <Sparkles className="w-6 h-6" />
        </div>
        <h2 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">TalentPulse</h2>
        <p className="mt-1 text-xs text-slate-500">
          Sign in to access your organization talent management portal
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <Card className="border-slate-200 shadow-md">
          <CardHeader className="p-6 pb-4 border-b border-slate-100">
            <CardTitle className="text-base font-semibold text-slate-900">Sign in to your account</CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Enter your work email and password below
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

              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="font-semibold text-slate-700">Password</label>
                  <Link href="/forgot-password" className="text-[11px] text-indigo-600 hover:underline">
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="pl-9 pr-9 h-9 text-xs font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs h-9 shadow-xs"
              >
                {loading ? "Authenticating..." : "Sign In"}
                <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </Button>
            </form>

            {/* Quick Demo Switcher */}
            <div className="pt-4 border-t border-slate-100 space-y-2">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider text-center">
                Instant Demo Access
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickLogin("rahul@acme.com")}
                  className={`p-2 rounded-lg border text-left text-xs transition-colors ${
                    email === "rahul@acme.com"
                      ? "bg-indigo-50 border-indigo-200 text-indigo-900 font-semibold"
                      : "bg-slate-50/60 border-slate-200 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <span className="block font-bold">Rahul Sharma</span>
                  <span className="text-[10px] text-slate-500 block">Employee Portal</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickLogin("manager@acme.com")}
                  className={`p-2 rounded-lg border text-left text-xs transition-colors ${
                    email === "manager@acme.com"
                      ? "bg-indigo-50 border-indigo-200 text-indigo-900 font-semibold"
                      : "bg-slate-50/60 border-slate-200 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <span className="block font-bold">Vikram Malhotra</span>
                  <span className="text-[10px] text-slate-500 block">Manager Portal</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickLogin("hr@acme.com")}
                  className={`p-2 rounded-lg border text-left text-xs transition-colors ${
                    email === "hr@acme.com"
                      ? "bg-indigo-50 border-indigo-200 text-indigo-900 font-semibold"
                      : "bg-slate-50/60 border-slate-200 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <span className="block font-bold">Sarah Jenkins</span>
                  <span className="text-[10px] text-slate-500 block">HR Admin Portal</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickLogin("exec@acme.com")}
                  className={`p-2 rounded-lg border text-left text-xs transition-colors ${
                    email === "exec@acme.com"
                      ? "bg-indigo-50 border-indigo-200 text-indigo-900 font-semibold"
                      : "bg-slate-50/60 border-slate-200 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <span className="block font-bold">David Sterling</span>
                  <span className="text-[10px] text-slate-500 block">Executive Portal</span>
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50/75 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
