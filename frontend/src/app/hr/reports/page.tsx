"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FileText,
  Download,
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  FileSpreadsheet,
} from "lucide-react";
import { api } from "@/lib/api/client";
import type { ReportJobItem, ReportTypeItem } from "@/lib/api/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { StatusChip } from "@/components/shared/StatusChip";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import { formatDateTime } from "@/lib/utils";

export default function ReportsPage() {
  const queryClient = useQueryClient();

  const [selectedType, setSelectedType] = useState("PERFORMANCE_SUMMARY");
  const [selectedFormat, setSelectedFormat] = useState("CSV");

  // Queries
  const { data: typesData } = useQuery({
    queryKey: ["report-types"],
    queryFn: () => api.reports.getTypes(),
  });

  const { data: jobsData, isLoading, error, refetch } = useQuery({
    queryKey: ["report-jobs"],
    queryFn: () => api.reports.listJobs(),
  });

  // Mutations
  const generateMutation = useMutation({
    mutationFn: (data: { report_type: string; format: string }) =>
      api.reports.requestJob(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["report-jobs"] });
    },
  });

  const retryMutation = useMutation({
    mutationFn: (jobId: string) => api.reports.retry(jobId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["report-jobs"] });
    },
  });

  const reportTypes: ReportTypeItem[] = Array.isArray(typesData) ? typesData : [];
  const jobs: ReportJobItem[] = Array.isArray(jobsData) ? jobsData : (jobsData as any)?.results || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Organization Reports</h1>
        <p className="text-sm text-slate-500 mt-1">
          Generate, schedule, and export compliance, headcount, performance, and skill inventory records.
        </p>
      </div>

      {/* Generate Report Card */}
      <Card>
        <CardHeader className="p-6 pb-4 border-b border-slate-100">
          <CardTitle className="text-base font-semibold text-slate-900 flex items-center space-x-2">
            <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
            <span>Generate New Export Job</span>
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            Reports are assembled asynchronously and audited under the DATA_EXPORTED log.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs font-semibold text-slate-700">Select Report Type</label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full h-9 px-3 rounded-md border border-slate-300 bg-white text-xs text-slate-800"
              >
                {reportTypes.map((t) => (
                  <option key={t.type} value={t.type}>
                    {t.name} — {t.description}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Export Format</label>
              <select
                value={selectedFormat}
                onChange={(e) => setSelectedFormat(e.target.value)}
                className="w-full h-9 px-3 rounded-md border border-slate-300 bg-white text-xs text-slate-800"
              >
                <option value="CSV">CSV (Spreadsheet Raw Data)</option>
                <option value="PDF">PDF (Formatted Printable Document)</option>
              </select>
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <Button
              size="sm"
              disabled={generateMutation.isPending}
              onClick={() =>
                generateMutation.mutate({
                  report_type: selectedType,
                  format: selectedFormat,
                })
              }
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              {generateMutation.isPending ? "Generating..." : "Generate Report"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Reports Job History Table */}
      <Card>
        <CardHeader className="p-6 pb-4 border-b border-slate-100 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold text-slate-900">Export Job History</CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Download previously generated files or monitor running jobs
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={() => refetch()} className="text-xs">
            <RotateCcw className="w-3.5 h-3.5 mr-1" />
            Refresh Status
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <LoadingState rows={5} />
          ) : error ? (
            <ErrorState message="Failed to load report history." onRetry={() => refetch()} />
          ) : jobs.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No report jobs requested yet. Generate your first export using the form above.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Report Name / Type</TableHead>
                  <TableHead>Format</TableHead>
                  <TableHead>Requested By</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.map((job) => (
                  <TableRow key={job.id} className="hover:bg-slate-50/75">
                    <TableCell className="font-semibold text-xs text-slate-900">
                      {job.report_type.replace(/_/g, " ")}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px] font-mono">
                        {job.format}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-slate-600">
                      {job.requested_by_email || "HR Administrator"}
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">
                      {formatDateTime(job.created_at)}
                    </TableCell>
                    <TableCell>
                      <StatusChip status={job.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      {job.status === "SUCCEEDED" ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 px-2.5 text-xs text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                          onClick={() => {
                            // Trigger download of demo CSV payload
                            const content = `Report: ${job.report_type}\nDate: ${new Date().toISOString()}\nExported by: ${job.requested_by_email || "HR"}\nStatus: Verified\n`;
                            const blob = new Blob([content], { type: "text/csv" });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement("a");
                            a.href = url;
                            a.download = `${job.report_type.toLowerCase()}_export.csv`;
                            a.click();
                          }}
                        >
                          <Download className="w-3.5 h-3.5 mr-1" />
                          Download
                        </Button>
                      ) : job.status === "FAILED" ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => retryMutation.mutate(job.id)}
                          className="h-8 px-2 text-rose-600 text-xs"
                        >
                          <RotateCcw className="w-3.5 h-3.5 mr-1" />
                          Retry
                        </Button>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Processing {job.progress_pct}%</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
