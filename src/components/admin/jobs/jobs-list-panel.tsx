"use client";

import * as React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

export interface JobExecution {
  id: string;
  status: string;
  retryCount: number;
  startedAt: string;
  completedAt?: string | null;
  errorMessage?: string | null;
}

export interface ScheduledJob {
  id: string;
  institutionId: string;
  type: "attendance" | "finance" | "academics";
  format: "pdf" | "excel";
  options: any;
  status: "queued" | "processing" | "success" | "failed" | "paused" | "cancelled";
  error?: string | null;
  createdAt: string;
  updatedAt: string;
  executions?: JobExecution[];
}

interface JobsListPanelProps {
  jobs: ScheduledJob[];
  isLoading: boolean;
  onRefresh: () => void;
  filters: {
    status: string;
    type: string;
    institutionId: string;
  };
  onFilterChange: (newFilters: { status: string; type: string; institutionId: string }) => void;
  renderActions: (job: ScheduledJob) => React.ReactNode;
}

export function JobsListPanel({
  jobs,
  isLoading,
  filters,
  onFilterChange,
  renderActions,
}: JobsListPanelProps) {
  const [searchInst, setSearchInst] = React.useState(filters.institutionId);

  // Debounce the institution ID search input
  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (filters.institutionId !== searchInst) {
        onFilterChange({ ...filters, institutionId: searchInst });
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchInst, filters, onFilterChange]);

  const [now, setNow] = React.useState(() => Date.now());

  React.useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "queued":
        return "info";
      case "processing":
        return "warning";
      case "success":
        return "success";
      case "failed":
        return "destructive";
      case "paused":
      case "cancelled":
      default:
        return "secondary";
    }
  };

  const formatDuration = (job: ScheduledJob) => {
    if (!job.executions || job.executions.length === 0) return "-";
    const latest = job.executions[0];
    const start = new Date(latest.startedAt).getTime();
    const end = latest.completedAt ? new Date(latest.completedAt).getTime() : now;
    const diffMs = end - start;
    if (diffMs < 0) return "0s";
    const secs = Math.floor(diffMs / 1000);
    if (secs < 60) return `${secs}s`;
    const mins = Math.floor(secs / 60);
    return `${mins}m ${secs % 60}s`;
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleString();
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-card p-4 rounded-xl border border-border">
        <div className="space-y-1">
          <label className="text-xs font-semibold text-muted-foreground">Status</label>
          <Select
            value={filters.status}
            onChange={(e) => onFilterChange({ ...filters, status: e.target.value })}
          >
            <option value="">All Statuses</option>
            <option value="queued">Queued</option>
            <option value="processing">Processing</option>
            <option value="success">Success</option>
            <option value="failed">Failed</option>
            <option value="paused">Paused</option>
            <option value="cancelled">Cancelled</option>
          </Select>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-muted-foreground">Report Type</label>
          <Select
            value={filters.type}
            onChange={(e) => onFilterChange({ ...filters, type: e.target.value })}
          >
            <option value="">All Types</option>
            <option value="attendance">Attendance</option>
            <option value="finance">Finance</option>
            <option value="academics">Academics</option>
          </Select>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-muted-foreground">Institution ID</label>
          <Input
            placeholder="Search by Institution ID..."
            value={searchInst}
            onChange={(e) => setSearchInst(e.target.value)}
          />
        </div>
      </div>

      {/* Table Section */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Job ID</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Format</TableHead>
              <TableHead>Institution</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created At</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, idx) => (
                <TableRow key={idx}>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-16 rounded-full" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-8 w-16 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : jobs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                  No scheduled report jobs found.
                </TableCell>
              </TableRow>
            ) : (
              jobs.map((job) => (
                <TableRow key={job.id}>
                  <TableCell className="font-mono text-xs max-w-[120px] truncate" title={job.id}>
                    {job.id}
                  </TableCell>
                  <TableCell className="capitalize">{job.type}</TableCell>
                  <TableCell className="uppercase text-xs font-semibold">{job.format}</TableCell>
                  <TableCell className="text-xs truncate max-w-[150px]" title={job.institutionId}>
                    {job.institutionId}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(job.status)}>
                      {job.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatDate(job.createdAt)}
                  </TableCell>
                  <TableCell className="text-xs">{formatDuration(job)}</TableCell>
                  <TableCell className="text-right">{renderActions(job)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
