import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

export function LoadingState({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3 p-4 bg-white rounded-lg border border-slate-200">
      <div className="flex justify-between items-center pb-2 border-b border-slate-100">
        <Skeleton className="h-6 w-1/4" />
        <Skeleton className="h-8 w-24" />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex space-x-4 items-center py-2">
          <Skeleton className="h-4 w-1/6" />
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-4 w-1/5" />
          <Skeleton className="h-4 w-1/6" />
          <Skeleton className="h-4 w-16 ml-auto" />
        </div>
      ))}
    </div>
  );
}
