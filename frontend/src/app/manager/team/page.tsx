"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Users,
  Search,
  Filter,
  Eye,
  Target,
  FileText,
  Award,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import { api } from "@/lib/api/client";
import type { ManagerTeamRosterItem } from "@/lib/api/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { StatusChip } from "@/components/shared/StatusChip";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";

export default function MyTeamPage() {
  const [q, setQ] = useState("");
  const [reviewStatus, setReviewStatus] = useState("");

  const { data: teamData, isLoading, error, refetch } = useQuery({
    queryKey: ["manager-team", { q, review_status: reviewStatus }],
    queryFn: () =>
      api.manager.getTeam({
        q: q || undefined,
        review_status: reviewStatus || undefined,
      }),
  });

  const team: ManagerTeamRosterItem[] = Array.isArray(teamData) ? teamData : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">My Team Roster</h1>
        <p className="text-sm text-slate-500 mt-1">
          Direct reports and team members in your reporting tree, performance scores, and open action queues.
        </p>
      </div>

      {/* Filter Row */}
      <Card>
        <CardContent className="p-4 flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              placeholder="Search team member by name..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>

          <div className="w-full sm:w-56">
            <select
              value={reviewStatus}
              onChange={(e) => setReviewStatus(e.target.value)}
              className="w-full h-9 px-3 rounded-md border border-slate-300 bg-white text-xs text-slate-800"
            >
              <option value="">All Review Statuses</option>
              <option value="NOT_STARTED">Not Started</option>
              <option value="SELF_ASSESSMENT">Self-Assessment</option>
              <option value="MANAGER_REVIEW">Manager Review</option>
              <option value="CALIBRATION">Calibration</option>
              <option value="COMPLETED">Completed</option>
            </select>
          </div>

          {(q || reviewStatus) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setQ("");
                setReviewStatus("");
              }}
              className="text-xs text-slate-500"
            >
              Clear
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Team Table */}
      {isLoading ? (
        <LoadingState rows={5} />
      ) : error ? (
        <ErrorState message="Failed to load team roster." onRetry={() => refetch()} />
      ) : team.length === 0 ? (
        <EmptyState
          title="No team members found"
          description="Direct reports assigned to you in the organization hierarchy will appear here."
        />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-64">Employee</TableHead>
                  <TableHead>Current Role</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Goal Score</TableHead>
                  <TableHead>Review Status</TableHead>
                  <TableHead>Career Readiness</TableHead>
                  <TableHead>Open Actions</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {team.map((member) => (
                  <TableRow key={member.id} className="hover:bg-slate-50/75">
                    <TableCell className="font-medium text-xs">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs shrink-0">
                          {member.employee.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                        </div>
                        <div>
                          <Link
                            href={`/manager/team/${member.employee.id}`}
                            className="font-bold text-slate-900 hover:text-indigo-600 transition-colors block"
                          >
                            {member.employee.name}
                          </Link>
                          <span className="text-[10px] text-slate-400 font-mono block">
                            {member.employee.employee_code}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-slate-700">{member.role}</TableCell>
                    <TableCell className="text-xs text-slate-500">{member.department}</TableCell>
                    <TableCell className="text-xs font-mono font-bold text-indigo-600">
                      {member.goal_score ? `${member.goal_score}` : "—"}
                    </TableCell>
                    <TableCell>
                      <StatusChip status={member.review_status} />
                    </TableCell>
                    <TableCell>
                      <StatusChip status={member.readiness_status} />
                    </TableCell>
                    <TableCell>
                      {member.open_actions_count > 0 ? (
                        <Badge variant="warning" className="text-[10px] font-bold">
                          {member.open_actions_count} Action{member.open_actions_count === 1 ? "" : "s"} Due
                        </Badge>
                      ) : (
                        <span className="text-xs text-slate-400 font-medium">Up to date</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/manager/team/${member.employee.id}`}>
                        <Button variant="ghost" size="sm" className="h-8 px-2 text-indigo-600 hover:bg-indigo-50 text-xs">
                          <Eye className="w-3.5 h-3.5 mr-1" />
                          View Profile
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}
    </div>
  );
}
