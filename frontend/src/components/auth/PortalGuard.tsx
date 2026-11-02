"use client";

import React, { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import { ShieldAlert, Sparkles } from "lucide-react";

interface PortalGuardProps {
  allowedRoles: Array<"HR_ADMIN" | "MANAGER" | "EMPLOYEE" | "EXECUTIVE">;
  children: React.ReactNode;
}

export function PortalGuard({ allowedRoles, children }: PortalGuardProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      const redirectUrl = pathname ? `/login?redirect=${encodeURIComponent(pathname)}` : "/login";
      router.replace(redirectUrl);
      return;
    }

    if (user.must_change_password && pathname !== "/change-password") {
      router.replace("/change-password");
      return;
    }

    if (!allowedRoles.includes(user.role)) {
      router.replace("/forbidden");
    }
  }, [user, loading, allowedRoles, pathname, router]);

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-md shadow-indigo-200 animate-pulse">
            <Sparkles className="w-6 h-6" />
          </div>
          <p className="text-xs font-semibold text-slate-600">Verifying secure session...</p>
        </div>
      </div>
    );
  }

  if (!user || (user.must_change_password && pathname !== "/change-password") || !allowedRoles.includes(user.role)) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <p className="text-xs text-slate-500 font-medium">Redirecting to authorized destination...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
