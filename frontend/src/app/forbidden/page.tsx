"use client";

import React from "react";
import Link from "next/link";
import { ShieldAlert, ArrowLeft, Home, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function ForbiddenPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8 text-center">
      <div className="w-16 h-16 rounded-3xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4 shadow-sm">
        <ShieldAlert className="w-8 h-8" />
      </div>

      <span className="text-xs uppercase font-extrabold tracking-widest text-rose-600">
        403 Access Denied
      </span>
      <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
        Restricted Portal Access
      </h1>
      <p className="mt-2 text-sm text-slate-500 max-w-md">
        You do not have the required administrative or role permissions to view this resource.
      </p>

      <div className="mt-8 flex flex-col sm:flex-row items-center gap-3">
        <Link href="/employee">
          <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs">
            <Home className="w-4 h-4 mr-1.5" />
            Return to Employee Portal
          </Button>
        </Link>
        <Link href="/login">
          <Button variant="outline" size="sm" className="text-xs bg-white">
            Switch Account
          </Button>
        </Link>
      </div>
    </div>
  );
}
