"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import { Sparkles } from "lucide-react";

export default function RootPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace("/login");
    } else if (user.role === "HR_ADMIN") {
      router.replace("/hr");
    } else if (user.role === "MANAGER") {
      router.replace("/manager");
    } else if (user.role === "EXECUTIVE") {
      router.replace("/executive");
    } else {
      router.replace("/employee");
    }
  }, [user, loading, router]);

  return (
    <div className="flex h-screen w-full items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-md shadow-indigo-200 animate-pulse">
          <Sparkles className="w-6 h-6" />
        </div>
        <p className="text-xs font-semibold text-slate-600">Routing to authorized portal...</p>
      </div>
    </div>
  );
}
