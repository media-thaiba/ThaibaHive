"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectItem } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Activity, ChevronLeft, ChevronRight } from "lucide-react";
import { formatDateTime } from "@/lib/utils";

type ActivityLog = {
  id: number;
  staffId: string | null;
  action: string;
  resourceType: string;
  resourceId: string | null;
  details: string | null;
  ipAddress: string | null;
  createdAt: string;
};

type LogResponse = {
  logs: ActivityLog[];
  total: number;
  page: number;
  limit: number;
};

const ACTION_LABELS: Record<string, string> = {
  LOGIN: "Logged in",
  LOGOUT: "Logged out",
  CREATE_TASK: "Created a task",
  UPDATE_TASK: "Updated a task",
  SUBMIT_LEAVE: "Submitted a leave request",
  UPDATE_STATUS: "Updated availability status",
  SEND_MESSAGE: "Sent a message",
  CREATE_ANNOUNCEMENT: "Created an announcement",
  CREATE_EVENT: "Created an event",
};

function formatAction(log: ActivityLog): string {
  const label = ACTION_LABELS[log.action] ?? log.action.replace(/_/g, " ").toLowerCase();
  if (log.resourceId) {
    return `${label} (${log.resourceType}:${log.resourceId.slice(0, 8)})`;
  }
  return label;
}

const RESOURCE_COLORS: Record<string, "default" | "info" | "warning" | "success" | "secondary"> = {
  auth: "info",
  task: "default",
  leave: "warning",
  chat: "success",
  announcement: "secondary",
  event: "info",
};

export default function TimelinePage() {
  const [data, setData] = useState<LogResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState("");
  const limit = 20;

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (actionFilter) params.set("action", actionFilter);

    fetch(`/api/activity-logs?${params}`)
      .then((r) => r.json())
      .then((d: LogResponse) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [page, actionFilter]);

  const totalPages = data ? Math.ceil(data.total / limit) : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Timeline"
        description="Recent activity across your team."
      />

      <div className="flex flex-col sm:flex-row gap-3">
        <Select value={actionFilter} onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}>
          <SelectItem value="">All actions</SelectItem>
          <SelectItem value="LOGIN">Login</SelectItem>
          <SelectItem value="LOGOUT">Logout</SelectItem>
          <SelectItem value="CREATE_TASK">Create Task</SelectItem>
          <SelectItem value="UPDATE_TASK">Update Task</SelectItem>
          <SelectItem value="SUBMIT_LEAVE">Submit Leave</SelectItem>
          <SelectItem value="UPDATE_STATUS">Status Update</SelectItem>
          <SelectItem value="SEND_MESSAGE">Send Message</SelectItem>
        </Select>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : !data || data.logs.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No activity logs found.</p>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {data.logs.map((log) => (
              <Card key={log.id}>
                <CardContent className="flex items-start gap-3 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">{formatAction(log)}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatDateTime(log.createdAt)}
                      {log.ipAddress && (
                        <span className="ml-2 opacity-60">from {log.ipAddress}</span>
                      )}
                    </p>
                  </div>
                  <Badge
                    variant={RESOURCE_COLORS[log.resourceType] ?? "secondary"}
                    className="text-xs shrink-0"
                  >
                    {log.resourceType}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Page {page} of {totalPages} ({data.total} total)
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
