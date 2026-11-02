"use client";

import React from "react";
import Link from "next/link";
import { Compass, Home, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8 text-center">
      <div className="w-16 h-16 rounded-3xl bg-indigo-100 text-indigo-600 flex items-center justify-center mx-auto mb-4 shadow-sm">
        <Compass className="w-8 h-8" />
      </div>

      <span className="text-xs uppercase font-extrabold tracking-widest text-indigo-600">
        404 Page Not Found
      </span>
      <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
        Resource Does Not Exist
      </h1>
      <p className="mt-2 text-sm text-slate-500 max-w-md">
        The page or talent management entity you are looking for has been moved, archived, or does not exist.
      </p>

      <div className="mt-8 flex items-center gap-3">
        <Link href="/employee">
          <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs">
            <Home className="w-4 h-4 mr-1.5" />
            Return to Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
}
