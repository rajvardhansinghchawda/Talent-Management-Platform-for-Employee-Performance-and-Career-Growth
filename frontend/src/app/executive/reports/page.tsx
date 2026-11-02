"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FileText,
  Download,
  Clock,
  Sparkles,
  Calendar,
  CheckCircle2,
  FileSpreadsheet,
  AlertCircle,
} from "lucide-react";
import { api, fetchApi } from "@/lib/api/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { StatusChip } from "@/components/shared/StatusChip";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { formatDate, formatDateTime } from "@/lib/utils";

interface CatalogResponse {
  catalog: Array<{
    type: string;
    name: string;
    description: string;
    formats: string[];
  }>;
  scheduled_reports: {
    available: boolean;
    message: string;
  };
}

export default function ExecutiveReportsPage() {
  const queryClient = useQueryClient();

  const { data: catalogData, isLoading: catLoading } = useQuery({
    queryKey: ["exec-reports-catalog"],
    queryFn: () => fetchApi<CatalogResponse>("/reports/catalog/"),
  });

  const { data: reportJobs, isLoading: jobsLoading, refetch } = useQuery({
    queryKey: ["exec-report-jobs"],
    queryFn: () => api.reports.listJobs(),
  });

  const generateMutation = useMutation({
    mutationFn: (data: { report_type: string; format: string }) =>
      api.reports.requestJob({
        report_type: data.report_type,
        format: data.format,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exec-report-jobs"] });
    },
  });

  const isLoading = catLoading || jobsLoading;
  if (isLoading) return <LoadingState rows={6} />;

  const jobs = Array.isArray(reportJobs) ? reportJobs : (reportJobs as any)?.results || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Executive Reports & Summaries</h1>
        <p className="text-sm text-slate-500 mt-1">
          Export organization talent summaries, succession depth analyses, and workforce capability audits.
        </p>
      </div>

      {/* Pre-defined Report Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {catalogData?.catalog.map((rep) => (
          <Card key={rep.type} className="border-indigo-100 bg-gradient-to-br from-indigo-50/20 to-white flex flex-col justify-between">
            <CardHeader className="p-6 pb-2">
              <div className="flex items-center space-x-2 text-indigo-600 mb-1.5">
                <FileText className="w-5 h-5" />
                <span className="text-[10px] uppercase font-bold tracking-wider">Executive Summary</span>
              </div>
              <CardTitle className="text-base font-bold text-slate-900">{rep.name}</CardTitle>
              <CardDescription className="text-xs text-slate-500 leading-relaxed mt-1">
                {rep.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 pt-2">
              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <div className="flex items-center space-x-1">
                  {rep.formats.map((fmt) => (
                    <Badge key={fmt} variant="secondary" className="text-[10px]">
                      {fmt}
                    </Badge>
                  ))}
                </div>
                <div className="flex items-center space-x-1.5">
                  <Button
                    size="sm"
                    disabled={generateMutation.isPending}
                    onClick={() => generateMutation.mutate({ report_type: rep.type, format: "PDF" })}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs"
                  >
                    Generate PDF
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Scheduled Reports Coming Soon Banner */}
      <div className="p-4 rounded-xl bg-slate-100 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-3">
          <Calendar className="w-5 h-5 text-indigo-600 shrink-0" />
          <div>
            <span className="font-bold text-slate-900 block">Automated Scheduled Executive Reports</span>
            <span className="text-slate-500 text-[11px]">
              {catalogData?.scheduled_reports.message || "Automated schedule dispatch coming in Q1 2027."}
            </span>
          </div>
        </div>
        <Badge variant="outline" className="text-[10px] uppercase font-bold shrink-0">
          Future Capability
        </Badge>
      </div>

      {/* Report Request History */}
      <Card>
        <CardHeader className="p-6 pb-3 border-b border-slate-100">
          <CardTitle className="text-base font-semibold text-slate-900">Recent Generated Summaries</CardTitle>
          <CardDescription className="text-xs text-slate-500 mt-0.5">
            Audit trail of requested executive exports and data downloads
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {jobs.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">No reports requested yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-80">Report Name</TableHead>
                  <TableHead>Format</TableHead>
                  <TableHead>Requested Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.map((j: any) => (
                  <TableRow key={j.id} className="hover:bg-slate-50/75 text-xs">
                    <TableCell className="font-semibold text-slate-900">
                      {j.report_type.replace(/_/g, " ")}
                    </TableCell>
                    <TableCell className="text-slate-600 font-mono">{j.format}</TableCell>
                    <TableCell className="text-slate-500">{formatDateTime(j.created_at)}</TableCell>
                    <TableCell>
                      <StatusChip status={j.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      {j.download_url ? (
                        <a href={j.download_url} download>
                          <Button variant="ghost" size="sm" className="h-7 text-xs text-indigo-600 hover:bg-indigo-50">
                            <Download className="w-3.5 h-3.5 mr-1" />
                            Download
                          </Button>
                        </a>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">Processing</span>
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
