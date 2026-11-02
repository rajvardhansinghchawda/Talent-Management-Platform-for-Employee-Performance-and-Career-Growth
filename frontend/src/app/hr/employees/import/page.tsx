"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import {
  UploadCloud,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  FileCheck,
  RotateCcw,
} from "lucide-react";
import { api } from "@/lib/api/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function EmployeeImportPage() {
  const router = useRouter();

  // Steps: 1 = Upload, 2 = Preview & Validate, 3 = Processed
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadId, setUploadId] = useState<string>("");
  const [previewRows, setPreviewRows] = useState<Array<Record<string, string>>>([]);
  const [rowErrors, setRowErrors] = useState<Array<{ row: number; field: string; message: string; row_data: Record<string, string> }>>([]);
  const [totalRows, setTotalRows] = useState<number>(0);
  const [importJobId, setImportJobId] = useState<string>("");
  const [jobStatus, setJobStatus] = useState<string>("COMPLETED");

  // Preview Mutation
  const previewMutation = useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      return api.employees.importPreview(formData);
    },
    onSuccess: (data) => {
      setUploadId(data.upload_id);
      setPreviewRows(data.preview_rows || []);
      setRowErrors(data.errors || []);
      setTotalRows(data.total_rows || 0);
      setCurrentStep(2);
    },
  });

  // Commit Mutation
  const commitMutation = useMutation({
    mutationFn: (skipInvalid: boolean) => api.employees.importCommit(uploadId, skipInvalid),
    onSuccess: (data) => {
      setImportJobId(data.job_id);
      setJobStatus("COMPLETED");
      setCurrentStep(3);
    },
  });

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.name.endsWith(".csv")) {
        setSelectedFile(file);
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <Link href="/hr/employees">
          <Button variant="ghost" size="sm" className="h-8 px-2 text-slate-500 hover:text-slate-900">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Employees
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Bulk Employee CSV Import</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Safely onboard multiple organization members, reporting assignments, and roles at scale.
          </p>
        </div>
      </div>

      {/* 3-Stage Progress Stepper */}
      <div className="grid grid-cols-3 gap-2 border-b border-slate-200 pb-4 text-xs font-medium">
        <div
          className={`flex items-center space-x-2 pb-1 border-b-2 ${
            currentStep >= 1 ? "border-indigo-600 text-indigo-600 font-semibold" : "border-transparent text-slate-400"
          }`}
        >
          <span className="w-5 h-5 rounded-full bg-indigo-50 border border-indigo-200 flex items-center justify-center text-[10px]">
            1
          </span>
          <span>Upload File</span>
        </div>
        <div
          className={`flex items-center space-x-2 pb-1 border-b-2 ${
            currentStep >= 2 ? "border-indigo-600 text-indigo-600 font-semibold" : "border-transparent text-slate-400"
          }`}
        >
          <span className="w-5 h-5 rounded-full bg-indigo-50 border border-indigo-200 flex items-center justify-center text-[10px]">
            2
          </span>
          <span>Validate & Preview</span>
        </div>
        <div
          className={`flex items-center space-x-2 pb-1 border-b-2 ${
            currentStep === 3 ? "border-indigo-600 text-indigo-600 font-semibold" : "border-transparent text-slate-400"
          }`}
        >
          <span className="w-5 h-5 rounded-full bg-indigo-50 border border-indigo-200 flex items-center justify-center text-[10px]">
            3
          </span>
          <span>Processed Summary</span>
        </div>
      </div>

      {/* STEP 1: Upload */}
      {currentStep === 1 && (
        <div className="space-y-6">
          {/* Download Template Banner */}
          <Card className="bg-indigo-50/40 border-indigo-100">
            <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center space-x-3">
                <FileSpreadsheet className="w-8 h-8 text-indigo-600 shrink-0" />
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Standard Employee CSV Template</h4>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    Download our verified column structure including employee_code, email, role, department, and manager.
                  </p>
                </div>
              </div>
              <a href={api.employees.importTemplateUrl()} download="employee_import_template.csv">
                <Button variant="outline" size="sm" className="bg-white text-xs shrink-0">
                  <Download className="w-3.5 h-3.5 mr-1.5 text-indigo-600" />
                  Download CSV Template
                </Button>
              </a>
            </CardContent>
          </Card>

          {/* Drag & Drop Upload Card */}
          <Card>
            <CardContent className="p-8">
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleFileDrop}
                className="border-2 border-dashed border-slate-300 hover:border-indigo-500 rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-colors bg-slate-50/50"
              >
                <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 mb-3">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-semibold text-slate-900">Choose a CSV file or drag and drop</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm">
                  Only .csv files supported. Maximum upload size 10 MB (up to 5,000 employees).
                </p>

                <div className="mt-4">
                  <input
                    type="file"
                    id="csv-file-input"
                    accept=".csv"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <label htmlFor="csv-file-input">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="bg-white text-xs cursor-pointer pointer-events-none"
                    >
                      Browse File
                    </Button>
                  </label>
                </div>

                {selectedFile && (
                  <div className="mt-4 p-2.5 rounded-lg bg-indigo-50 border border-indigo-200 text-xs text-indigo-900 flex items-center space-x-2">
                    <FileCheck className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span className="font-semibold">{selectedFile.name}</span>
                    <span className="text-[11px] text-slate-500">
                      ({(selectedFile.size / 1024).toFixed(1)} KB)
                    </span>
                  </div>
                )}
              </div>

              {previewMutation.isError && (
                <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
                  {previewMutation.error instanceof Error
                    ? previewMutation.error.message
                    : "Failed to validate CSV file."}
                </div>
              )}

              <div className="mt-6 flex justify-end">
                <Button
                  disabled={!selectedFile || previewMutation.isPending}
                  onClick={() => selectedFile && previewMutation.mutate(selectedFile)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  {previewMutation.isPending ? "Validating..." : "Continue to Preview"}
                  <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* STEP 2: Preview & Validation Results */}
      {currentStep === 2 && (
        <div className="space-y-6">
          <Card>
            <CardHeader className="p-6 pb-4 border-b border-slate-100 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold text-slate-900">
                  Data Validation & Sample Preview
                </CardTitle>
                <CardDescription className="text-xs text-slate-500 mt-0.5">
                  Parsed {totalRows} total rows · {rowErrors.length} errors found
                </CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setCurrentStep(1)} className="text-xs">
                <RotateCcw className="w-3.5 h-3.5 mr-1" />
                Upload Different File
              </Button>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {/* Row Errors Panel if any */}
              {rowErrors.length > 0 && (
                <div className="p-4 rounded-lg bg-amber-50/70 border border-amber-200 space-y-3">
                  <div className="flex items-center space-x-2 text-amber-900 font-semibold text-xs">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>{rowErrors.length} rows have validation errors</span>
                  </div>
                  <div className="max-h-40 overflow-y-auto space-y-1.5 text-xs">
                    {rowErrors.map((err, i) => (
                      <div key={i} className="text-amber-800 text-[11px] bg-white p-1.5 rounded border border-amber-100">
                        Row {err.row}: <strong>{err.field}</strong> — {err.message}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Data Table Sample Preview */}
              <div>
                <h4 className="text-xs font-semibold text-slate-700 mb-2">Sample Preview (First {previewRows.length} Rows)</h4>
                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {previewRows[0] &&
                          Object.keys(previewRows[0]).map((key) => (
                            <TableHead key={key} className="text-xs font-semibold uppercase">
                              {key}
                            </TableHead>
                          ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previewRows.map((row, idx) => (
                        <TableRow key={idx}>
                          {Object.values(row).map((val, cellIdx) => (
                            <TableCell key={cellIdx} className="text-xs text-slate-700">
                              {val || <span className="text-slate-300 italic">empty</span>}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Commit Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <Button variant="outline" size="sm" onClick={() => setCurrentStep(1)}>
                  Back
                </Button>
                <div className="flex items-center space-x-3">
                  {rowErrors.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => commitMutation.mutate(true)}
                      disabled={commitMutation.isPending}
                      className="text-amber-700 border-amber-300 hover:bg-amber-50"
                    >
                      Skip Invalid Rows & Import Valid
                    </Button>
                  )}
                  <Button
                    size="sm"
                    onClick={() => commitMutation.mutate(false)}
                    disabled={commitMutation.isPending || rowErrors.length > 0}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white"
                  >
                    {commitMutation.isPending ? "Importing Records..." : "Commit Full Import"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* STEP 3: Complete / Finished */}
      {currentStep === 3 && (
        <Card className="text-center p-8">
          <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-3">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <CardTitle className="text-lg font-bold text-slate-900">Import Job Completed!</CardTitle>
          <CardDescription className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-6">
            All validated employee records have been onboarded into the organization hierarchy.
          </CardDescription>

          <div className="flex justify-center space-x-3">
            <Button variant="outline" size="sm" onClick={() => setCurrentStep(1)}>
              Import Another File
            </Button>
            <Button size="sm" onClick={() => router.push("/hr/employees")} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              Return to Employees Directory
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
