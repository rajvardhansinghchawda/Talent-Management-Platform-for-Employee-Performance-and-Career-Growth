"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ShieldCheck,
  Search,
  Filter,
  Eye,
  Download,
  Calendar,
  User,
  ArrowRight,
  Layers,
} from "lucide-react";
import { api } from "@/lib/api/client";
import type { AuditLogItem } from "@/lib/api/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import { formatDateTime } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function AuditLogsPage() {
  const [q, setQ] = useState("");
  const [action, setAction] = useState("");
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);

  // Queries
  const { data: logsData, isLoading, error, refetch } = useQuery({
    queryKey: ["audit-logs", { q, action }],
    queryFn: () =>
      api.audit.list({
        q: q || undefined,
        action: action || undefined,
      }),
  });

  const logs: AuditLogItem[] = Array.isArray(logsData) ? logsData : (logsData as any)?.results || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Audit Logs & Security Trail</h1>
          <p className="text-sm text-slate-500 mt-1">
            Immutable, append-only chronological log of all role changes, rating modifications, and settings updates.
          </p>
        </div>
        <Button variant="outline" size="sm" className="bg-white text-xs">
          <Download className="w-3.5 h-3.5 mr-1.5" />
          Export Audit Trail
        </Button>
      </div>

      {/* Filter Row */}
      <Card>
        <CardContent className="p-4 flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              placeholder="Search event summary or affected entity..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>

          <div className="w-full sm:w-64">
            <select
              value={action}
              onChange={(e) => setAction(e.target.value)}
              className="w-full h-9 px-3 rounded-md border border-slate-300 bg-white text-xs text-slate-800"
            >
              <option value="">All Action Types</option>
              <option value="ORG_SETTINGS_CHANGED">Org Settings Changed</option>
              <option value="EMPLOYEE_CREATED">Employee Created</option>
              <option value="MANAGER_CHANGED">Manager Changed</option>
              <option value="CALIBRATION_PROPOSED">Calibration Proposed</option>
              <option value="RATING_CHANGED">Rating Changed</option>
              <option value="ROLE_REQUIREMENTS_CHANGED">Role Requirements Changed</option>
              <option value="USER_ROLE_CHANGED">User Role Changed</option>
            </select>
          </div>

          {(q || action) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setQ("");
                setAction("");
              }}
              className="text-xs text-slate-500"
            >
              Clear
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Audit Table */}
      {isLoading ? (
        <LoadingState rows={6} />
      ) : error ? (
        <ErrorState message="Failed to load audit logs." onRetry={() => refetch()} />
      ) : logs.length === 0 ? (
        <EmptyState
          title="No audit events found"
          description="Security and policy events are logged automatically as actions occur."
        />
      ) : (
        <Card>
          {/* Desktop Table (md:block, hidden on mobile) */}
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-44">Date / Time</TableHead>
                  <TableHead>Actor</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Entity / Target</TableHead>
                  <TableHead className="w-96">Summary</TableHead>
                  <TableHead className="text-right">Diff</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id} className="hover:bg-slate-50/75">
                    <TableCell className="text-xs text-slate-500 font-mono">
                      {formatDateTime(log.created_at)}
                    </TableCell>
                    <TableCell className="text-xs font-medium text-slate-900">
                      {log.actor_name || log.actor_email || "System"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px] uppercase font-mono bg-slate-50">
                        {log.action.replace(/_/g, " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-slate-700">
                      <span className="font-semibold">{log.entity.label || log.entity.id}</span>
                      <span className="text-[10px] text-slate-400 block font-mono">{log.entity.type}</span>
                    </TableCell>
                    <TableCell className="text-xs text-slate-600 max-w-sm truncate">
                      {log.summary}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedLog(log)}
                        className="h-8 px-2 text-indigo-600 hover:bg-indigo-50 text-xs"
                      >
                        <Eye className="w-3.5 h-3.5 mr-1" />
                        Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Stacked Cards (< md) */}
          <div className="block md:hidden divide-y divide-slate-100">
            {logs.map((log) => (
              <div key={log.id} className="p-4 space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <Badge variant="outline" className="text-[10px] uppercase font-mono bg-slate-50">
                    {log.action.replace(/_/g, " ")}
                  </Badge>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {formatDateTime(log.created_at)}
                  </span>
                </div>

                <div className="text-xs">
                  <span className="font-semibold text-slate-900 block">
                    {log.entity.label || log.entity.id}
                  </span>
                  <p className="text-slate-600 mt-1 leading-relaxed">{log.summary}</p>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                  <span className="text-[11px] text-slate-500">
                    By: <strong>{log.actor_name || log.actor_email || "System"}</strong>
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedLog(log)}
                    className="h-7 px-2.5 text-xs text-indigo-600 border-indigo-200"
                  >
                    <Eye className="w-3.5 h-3.5 mr-1" />
                    View Diff
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Two-Column Diff Comparison Modal */}
      {selectedLog && (
        <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <div className="flex items-center space-x-2 text-indigo-600">
                <ShieldCheck className="w-5 h-5" />
                <DialogTitle>Audit Event Details</DialogTitle>
              </div>
              <DialogDescription>
                {selectedLog.action.replace(/_/g, " ")} on {selectedLog.entity.label || selectedLog.entity.id}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2 text-xs">
              {/* Event Metadata */}
              <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200">
                <div>
                  <span className="text-slate-400 font-medium block">Timestamp:</span>
                  <span className="font-semibold text-slate-900">{formatDateTime(selectedLog.created_at)}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium block">Actor:</span>
                  <span className="font-semibold text-slate-900">
                    {selectedLog.actor_name || selectedLog.actor_email || "System Service"}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-slate-500 font-medium block mb-1">Event Summary:</span>
                <p className="p-2.5 rounded bg-slate-50 border border-slate-200 text-slate-800 font-medium">
                  {selectedLog.summary}
                </p>
              </div>

              {/* 2-Column Before / After Comparison */}
              {(selectedLog.before || selectedLog.after) ? (
                <div>
                  <span className="text-slate-700 font-semibold block mb-2">Field-Level Changes Comparison</span>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg border border-red-200 bg-red-50/40">
                      <span className="font-bold text-red-900 uppercase text-[10px] block mb-1.5">
                        Before (Previous State)
                      </span>
                      <pre className="text-[11px] font-mono text-red-800 whitespace-pre-wrap overflow-x-auto">
                        {JSON.stringify(selectedLog.before, null, 2)}
                      </pre>
                    </div>

                    <div className="p-3 rounded-lg border border-emerald-200 bg-emerald-50/40">
                      <span className="font-bold text-emerald-900 uppercase text-[10px] block mb-1.5">
                        After (Committed State)
                      </span>
                      <pre className="text-[11px] font-mono text-emerald-800 whitespace-pre-wrap overflow-x-auto">
                        {JSON.stringify(selectedLog.after, null, 2)}
                      </pre>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-3 text-center text-slate-400 italic bg-slate-50 rounded border border-slate-200">
                  No structural JSON diff recorded for this event.
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
