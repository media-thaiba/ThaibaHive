"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ensureArray } from "@/lib/utils";

type ViolationRow = {
  id: string;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  status: string;
  presenceStatus: string | null;
  lastVerifiedAt: string | null;
  geofenceViolations: number | null;
  institutionId: string | null;
  staffId: string;
  staffName: string | null;
  staffLastName: string | null;
  employeeId: string | null;
};

type ViolationStats = {
  violationDays: number;
  staffAffected: number;
  totalOccurrences: number;
};

type PresenceSettings = {
  isEnabled: boolean;
  shadowMode: boolean;
  checkIntervalMinutes: number;
} | null;

const PAGE_SIZE = 20;

function isoDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

function statusBadgeVariant(status: string): "success" | "warning" | "destructive" | "secondary" | "outline" {
  if (status === "late") return "warning";
  if (status === "absent") return "destructive";
  if (status === "present") return "success";
  if (status === "half_day") return "info" as "success";
  return "outline";
}

function presenceBadgeVariant(presence: string | null): "success" | "warning" | "destructive" | "secondary" | "outline" | "info" {
  if (presence === "verified") return "success";
  if (presence === "unverified") return "destructive";
  if (presence === "field_work") return "info";
  return "outline";
}

export default function ViolationsPanel() {
  const [from, setFrom] = useState(() => isoDate(new Date(Date.now() - 30 * 86_400_000)));
  const [to, setTo] = useState(() => isoDate(new Date()));
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<ViolationRow[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<ViolationStats>({ violationDays: 0, staffAffected: 0, totalOccurrences: 0 });
  const [settings, setSettings] = useState<PresenceSettings>(null);
  const [flags, setFlags] = useState<Record<string, boolean> | null>(null);

  const fetchViolations = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      if (search.trim()) params.set("search", search.trim());
      params.set("page", String(page));
      params.set("limit", String(PAGE_SIZE));

      const res = await fetch(`/api/attendance/violations?${params.toString()}`);
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || `Request failed (${res.status})`);
      }
      const data = await res.json();
      setRows(ensureArray<ViolationRow>(data.violations));
      setTotal(data.total ?? 0);
      setStats(data.stats ?? { violationDays: 0, staffAffected: 0, totalOccurrences: 0 });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load violations");
    } finally {
      setLoading(false);
    }
  }, [from, to, search, page]);

  useEffect(() => {
    fetchViolations();
  }, [fetchViolations]);

  // Best-effort context chips: tolerate 403 on either endpoint by hiding
  // the chip instead of breaking the cockpit (e.g. principal lacks features:read).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/attendance/settings");
        if (res.ok) {
          const data = await res.json();
          if (!cancelled && data.settings) setSettings(data.settings);
        }
      } catch {
        /* best-effort */
      }
      try {
        const res = await fetch("/api/features");
        if (res.ok) {
          const data = await res.json();
          if (!cancelled && data.flags) setFlags(data.flags);
        }
      } catch {
        /* best-effort */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function applyFilter(change: Partial<{ from: string; to: string; search: string }>) {
    if (change.from !== undefined) setFrom(change.from);
    if (change.to !== undefined) setTo(change.to);
    if (change.search !== undefined) setSearch(change.search);
    setPage(1);
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const multiInstitution = new Set(rows.map((r) => r.institutionId).filter(Boolean)).size > 1;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Presence Violations</h2>
          <p className="text-xs text-muted-foreground">
            Server-recomputed geofence &amp; mock-location violations from presence verification
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {settings && (
            <>
              <Badge variant={settings.isEnabled ? "success" : "destructive"}>
                {settings.isEnabled ? "Verification on" : "Verification off"}
              </Badge>
              <Badge variant={settings.shadowMode ? "warning" : "info"}>
                {settings.shadowMode ? "Shadow mode" : "Enforcing actions"}
              </Badge>
              <Badge variant="outline">Every {settings.checkIntervalMinutes}m</Badge>
            </>
          )}
          {flags && (
            <Badge variant={flags["presence_tracking"] ? "info" : "secondary"}>
              presence_tracking {flags["presence_tracking"] ? "ON" : "OFF"}
            </Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Violation days</p>
            <p className="text-2xl font-bold">{stats.violationDays}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Staff affected</p>
            <p className="text-2xl font-bold">{stats.staffAffected}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total occurrences</p>
            <p className="text-2xl font-bold">{stats.totalOccurrences}</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <label htmlFor="violations-from" className="text-xs font-medium text-muted-foreground">
            From
          </label>
          <Input
            id="violations-from"
            type="date"
            value={from}
            max={to || undefined}
            onChange={(e) => applyFilter({ from: e.target.value })}
            className="w-40"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="violations-to" className="text-xs font-medium text-muted-foreground">
            To
          </label>
          <Input
            id="violations-to"
            type="date"
            value={to}
            min={from || undefined}
            onChange={(e) => applyFilter({ to: e.target.value })}
            className="w-40"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="violations-search" className="text-xs font-medium text-muted-foreground">
            Staff
          </label>
          <Input
            id="violations-search"
            value={search}
            onChange={(e) => applyFilter({ search: e.target.value })}
            placeholder="Name or employee ID"
            className="w-56"
          />
        </div>
        <Button variant="outline" onClick={() => fetchViolations()} disabled={loading}>
          Refresh
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="flex items-center justify-between p-4">
                <div className="space-y-2 w-1/3">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-4 w-28" />
                </div>
                <div className="flex gap-2">
                  <Skeleton className="h-5 w-20" />
                  <Skeleton className="h-5 w-24" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            {search.trim()
              ? `No violations match "${search.trim()}" in the selected range.`
              : "No presence violations in the selected range. Nothing to review here."}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => {
            const name = `${row.staffName ?? ""} ${row.staffLastName ?? ""}`.trim() || row.employeeId || row.staffId;
            const occurrences = row.geofenceViolations ?? 0;
            return (
              <Card key={row.id}>
                <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium truncate">{name}</p>
                      {row.employeeId && (
                        <span className="text-xs text-muted-foreground">{row.employeeId}</span>
                      )}
                      <Badge variant={occurrences >= 5 ? "destructive" : "warning"}>
                        {occurrences} {occurrences === 1 ? "violation" : "violations"}
                      </Badge>
                      <Badge variant={statusBadgeVariant(row.status)}>{row.status}</Badge>
                      <Badge variant={presenceBadgeVariant(row.presenceStatus)}>
                        {row.presenceStatus ?? "unknown"}
                      </Badge>
                      {multiInstitution && row.institutionId && (
                        <Badge variant="outline">{row.institutionId}</Badge>
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span>{row.date}</span>
                      <span>
                        {row.checkIn ?? "--:--"} — {row.checkOut ?? "open"}
                      </span>
                      {row.lastVerifiedAt && (
                        <span>
                          Last verified: {new Date(row.lastVerifiedAt).toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Page {page} of {totalPages} · {total} violation {total === 1 ? "day" : "days"}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
