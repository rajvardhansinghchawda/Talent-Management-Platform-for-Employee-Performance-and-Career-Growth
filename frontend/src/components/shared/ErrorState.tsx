import React from "react";
import { AlertCircle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({
  message = "Failed to load data from server.",
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center border border-red-200 bg-red-50/50 rounded-lg my-4">
      <AlertCircle className="w-8 h-8 text-red-500 mb-2" />
      <h4 className="text-sm font-semibold text-red-900">An Error Occurred</h4>
      <p className="text-xs text-red-600 max-w-md mt-1 mb-3">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} className="bg-white text-xs">
          <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
          Retry
        </Button>
      )}
    </div>
  );
}
