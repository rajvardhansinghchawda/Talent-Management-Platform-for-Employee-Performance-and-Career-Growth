import React from "react";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, AlertCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatusChipProps {
  status: string | null | undefined;
  className?: string;
}

export function StatusChip({ status, className }: StatusChipProps) {
  if (!status) return null;
  const s = status.toUpperCase();

  let variant: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info" = "secondary";
  let icon = <Clock className="w-3 h-3 mr-1" />;
  let label = status.replace(/_/g, " ");

  if (s === "ACTIVE" || s === "COMPLETED" || s === "SUCCEEDED" || s === "VALIDATED" || s === "READY_FOR_REVIEW") {
    variant = "success";
    icon = <CheckCircle2 className="w-3 h-3 mr-1" />;
  } else if (s === "CALIBRATION" || s === "NEAR_READY" || s === "PENDING" || s === "PENDING_APPROVAL" || s === "SELF_ASSESSMENT" || s === "MANAGER_REVIEW") {
    variant = "warning";
    icon = <Clock className="w-3 h-3 mr-1" />;
  } else if (s === "FAILED" || s === "CANCELLED" || s === "REJECTED" || s === "EXITED" || s === "DISPUTED") {
    variant = "destructive";
    icon = <XCircle className="w-3 h-3 mr-1" />;
  } else if (s === "DEVELOPING" || s === "IN_PROGRESS" || s === "RUNNING") {
    variant = "info";
    icon = <AlertCircle className="w-3 h-3 mr-1" />;
  }

  return (
    <Badge variant={variant} className={cn("capitalize font-normal text-xs py-0.5", className)}>
      {icon}
      {label}
    </Badge>
  );
}
