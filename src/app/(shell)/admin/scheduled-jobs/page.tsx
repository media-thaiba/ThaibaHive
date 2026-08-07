"use client";

import * as React from "react";
import { PageHeader } from "@/components/ui/page-header";
import { JobsListPanel, ScheduledJob } from "@/components/admin/jobs/jobs-list-panel";
import { JobActionsPanel, TriggerJobDialog } from "@/components/admin/jobs/jobs-actions-panel";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";

export default function ScheduledJobsAdminPage() {
  const { staff, isLoading: authLoading } = useAuth();
  const [jobs, setJobs] = React.useState<ScheduledJob[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [filters, setFilters] = React.useState({
    status: "",
    type: "",
    institutionId: "",
  });

  const fetchJobs = React.useCallback(async () => {
    try {
      const queryParams = new URLSearchParams();
      if (filters.status) queryParams.set("status", filters.status);
      if (filters.type) queryParams.set("type", filters.type);
      if (filters.institutionId) queryParams.set("institutionId", filters.institutionId);

      const res = await fetch(`/api/admin/scheduled-jobs?${queryParams.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setJobs(data.jobs || []);
      } else {
        toast.error(data.error || "Failed to load scheduled jobs");
      }
    } catch {
      toast.error("Failed to fetch scheduled jobs list");
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  React.useEffect(() => {
    if (staff && staff.role === "super_admin") {
      setIsLoading(true);
      fetchJobs();
    }
  }, [fetchJobs, staff]);

  // Set up periodic polling to keep job processing statuses updated in the UI
  React.useEffect(() => {
    if (staff && staff.role === "super_admin") {
      const timer = setInterval(() => {
        fetchJobs();
      }, 10000);
      return () => clearInterval(timer);
    }
  }, [fetchJobs, staff]);

  if (authLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-10 w-1/4" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!staff || staff.role !== "super_admin") {
    return (
      <div className="container mx-auto p-6 text-center space-y-4 max-w-md mt-20">
        <div className="bg-destructive/10 text-destructive p-6 rounded-xl border border-destructive/20 shadow-xs">
          <h2 className="text-lg font-bold">Access Restricted</h2>
          <p className="text-sm mt-2 text-muted-foreground">
            Only operators with the <strong className="text-foreground">super_admin</strong> role are permitted to view or manage scheduled report queue operations.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        title="Scheduled Jobs Management"
        description="Monitor, pause, resume, cancel, or trigger report compilation jobs inside the database queue."
        actions={<TriggerJobDialog onRefresh={fetchJobs} />}
      />

      <JobsListPanel
        jobs={jobs}
        isLoading={isLoading}
        filters={filters}
        onFilterChange={setFilters}
        onRefresh={fetchJobs}
        renderActions={(job) => <JobActionsPanel job={job} onRefresh={fetchJobs} />}
      />
    </div>
  );
}
