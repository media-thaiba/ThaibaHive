"use client";

import * as React from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  preferenceKey: string;
  oldValue: string | null;
  newValue: string;
  ipAddress: string | null;
  institutionId: string | null;
}

export default function AuditLogsPage() {
  const { staff, isLoading: authLoading } = useAuth();
  const [logs, setLogs] = React.useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  
  // Filters state
  const [userId, setUserId] = React.useState("");
  const [prefKey, setPrefKey] = React.useState("");
  const [instId, setInstId] = React.useState("");
  
  // Debounced filter values used for API requests
  const [debouncedFilters, setDebouncedFilters] = React.useState({
    userId: "",
    preferenceKey: "",
    institutionId: "",
  });

  // Pagination state
  const [page, setPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(1);
  const [totalItems, setTotalItems] = React.useState(0);
  const limit = 20;

  // Handle debouncing of filters
  React.useEffect(() => {
    if (staff && staff.role === "super_admin") {
      const handler = setTimeout(() => {
        setDebouncedFilters({
          userId,
          preferenceKey: prefKey,
          institutionId: instId,
        });
        setPage(1); // Reset page to 1 on filter change
      }, 500);

      return () => clearTimeout(handler);
    }
  }, [userId, prefKey, instId, staff]);

  const fetchLogs = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const qp = new URLSearchParams();
      qp.set("page", String(page));
      qp.set("limit", String(limit));
      if (debouncedFilters.userId) qp.set("userId", debouncedFilters.userId);
      if (debouncedFilters.preferenceKey) qp.set("preferenceKey", debouncedFilters.preferenceKey);
      if (debouncedFilters.institutionId) qp.set("institutionId", debouncedFilters.institutionId);

      const res = await fetch(`/api/admin/audit-logs?${qp.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setLogs(data.logs || []);
        setTotalPages(data.pagination?.totalPages || 1);
        setTotalItems(data.pagination?.total || 0);
      } else {
        toast.error(data.error || "Failed to load audit logs");
      }
    } catch {
      toast.error("Failed to fetch audit logs list");
    } finally {
      setIsLoading(false);
    }
  }, [page, debouncedFilters]);

  React.useEffect(() => {
    if (staff && staff.role === "super_admin") {
      fetchLogs();
    }
  }, [fetchLogs, staff]);

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
            Only operators with the <strong className="text-foreground">super_admin</strong> role are permitted to view or query user preference changes or administrative audit logs.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        title="Preference Audit Logs"
        description="Review historical system configuration changes, preference adjustments, and administrative security audits."
      />

      {/* Filter panel */}
      <div className="bg-card p-4 rounded-xl border border-border grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="space-y-1">
          <label className="text-xs font-semibold text-muted-foreground">Search User ID</label>
          <Input
            placeholder="e.g. user_01"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-semibold text-muted-foreground">Search Preference Key</label>
          <Input
            placeholder="e.g. theme, notification"
            value={prefKey}
            onChange={(e) => setPrefKey(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-semibold text-muted-foreground">Search Institution ID</label>
          <Input
            placeholder="e.g. inst_01"
            value={instId}
            onChange={(e) => setInstId(e.target.value)}
          />
        </div>
      </div>

      {/* Table view */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-foreground">
            <thead className="bg-muted/50 text-xs font-semibold text-muted-foreground uppercase border-b border-border">
              <tr>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">User ID</th>
                <th className="px-4 py-3">Preference Key</th>
                <th className="px-4 py-3">Old Value</th>
                <th className="px-4 py-3">New Value</th>
                <th className="px-4 py-3">IP Address</th>
                <th className="px-4 py-3">Institution ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={7} className="px-4 py-4">
                      <Skeleton className="h-4 w-full" />
                    </td>
                  </tr>
                ))
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                    No matching audit logs found.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 text-xs font-mono text-muted-foreground">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{log.userId}</td>
                    <td className="px-4 py-3 font-semibold text-xs font-mono">{log.preferenceKey}</td>
                    <td className="px-4 py-3 text-xs max-w-[150px] truncate font-mono text-muted-foreground">
                      {log.oldValue || <span className="italic text-muted-foreground/50">null</span>}
                    </td>
                    <td className="px-4 py-3 text-xs max-w-[150px] truncate font-mono text-success">
                      {log.newValue}
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-muted-foreground">
                      {log.ipAddress || <span className="italic text-muted-foreground/50">unknown</span>}
                    </td>
                    <td className="px-4 py-3 text-xs font-mono">
                      {log.institutionId || <span className="italic text-muted-foreground/50">-</span>}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination controls */}
        {!isLoading && totalPages > 1 && (
          <div className="flex justify-between items-center bg-muted/20 p-4 border-t border-border">
            <span className="text-xs text-muted-foreground">
              Showing {(page - 1) * limit + 1} to {Math.min(page * limit, totalItems)} of {totalItems} items
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
              >
                Previous
              </Button>
              <span className="text-xs font-medium px-2">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
