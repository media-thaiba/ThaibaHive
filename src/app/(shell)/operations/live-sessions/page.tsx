"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert } from "@/components/ui/alert";
import { Select, SelectItem } from "@/components/ui/select";
import { PermissionGate } from "@/components/ui/permission-gate";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "sonner";
import { Lock, Play, Radio } from "lucide-react";
import { useFeatureFlags } from "@/lib/hooks/use-feature-flags";
import { StartSessionDialog } from "./_components/start-session-dialog";
import { LiveSessionViewer } from "./_components/live-session-viewer";
import {
  SESSION_STATUS_VARIANT,
  SESSION_TYPE_LABEL,
  type LiveSession,
} from "./_components/types";

const STATUS_FILTERS = ["all", "active", "completed", "terminated", "expired", "failed"] as const;

export default function LiveSessionsPage() {
  const { isFeatureEnabled, loading: flagsLoading } = useFeatureFlags();
  const liveEnabled = isFeatureEnabled("live_streaming");

  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]>("all");
  const [selected, setSelected] = useState<LiveSession | null>(null);
  const [startOpen, setStartOpen] = useState(false);

  const loadSessions = useCallback(async () => {
    if (!liveEnabled) return;
    try {
      const qs = statusFilter === "all" ? "" : `?status=${statusFilter}`;
      const res = await fetch(`/api/live/sessions${qs}`);
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        const list: LiveSession[] = Array.isArray(data.sessions) ? data.sessions : [];
        setSessions(list);
        setSelected((prev) => (prev ? list.find((s) => s.id === prev.id) || prev : null));
      } else if (res.status === 403) {
        toast.error(data.error || "Live streaming feature is disabled");
      } else {
        toast.error(data.error || "Failed to load live sessions");
      }
    } catch {
      toast.error("Failed to load live sessions");
    } finally {
      setLoading(false);
    }
  }, [liveEnabled, statusFilter]);

  useEffect(() => {
    loadSessions().catch(() => {});
  }, [loadSessions]);

  useEffect(() => {
    if (!liveEnabled || !selected) return;
    const timer = setInterval(() => {
      loadSessions().catch(() => {});
    }, 10000);
    return () => clearInterval(timer);
  }, [liveEnabled, selected, loadSessions]);

  const activeCount = useMemo(() => sessions.filter((s) => s.status === "active").length, [sessions]);
  const totalSeconds = useMemo(() => sessions.reduce((sum, s) => sum + (s.totalSeconds || 0), 0), [sessions]);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        title="Live Sessions"
        description="Duplex multimodal streaming cockpit — transcripts, hazard alerts and session controls"
        actions={
          <PermissionGate permission="live_stream:start" loadingFallback={null}>
            <Button type="button" onClick={() => setStartOpen(true)} disabled={!liveEnabled} aria-label="Start a live session">
              <Play aria-hidden className="mr-1.5 h-4 w-4" />
              Start session
            </Button>
          </PermissionGate>
        }
      />

      {!flagsLoading && !liveEnabled ? (
        <div className="space-y-4">
          <Alert variant="warning" role="alert" aria-label="Live streaming disabled">
            <p className="font-semibold text-sm">Live multimodal streaming is switched off</p>
            <p className="text-xs mt-1">
              The <code className="rounded bg-background px-1">live_streaming</code> feature flag is disabled for this
              institution, so sessions cannot be started and the SSE viewer is unavailable. Enable it under Institution
              Settings → Features. Historical session records remain readable once the flag is on.
            </p>
          </Alert>
          <Card aria-label="Live sessions disabled">
            <CardContent className="py-12 flex flex-col items-center text-center gap-3">
              <Lock aria-hidden className="h-8 w-8 text-muted-foreground/50" />
              <p className="text-sm font-semibold">Streaming locked</p>
              <p className="text-xs text-muted-foreground max-w-sm">
                The Gemini Live adapter, VAD transcriber and keyframe pipeline stay installed but idle until the flag is
                enabled.
              </p>
            </CardContent>
          </Card>
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">Active sessions</p>
                <p className="text-2xl font-bold tabular-nums">{activeCount}</p>
                <p className="text-[11px] text-muted-foreground">3 concurrent max per institution</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">Sessions listed</p>
                <p className="text-2xl font-bold tabular-nums">{sessions.length}</p>
                <p className="text-[11px] text-muted-foreground">current filter</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">Streamed seconds</p>
                <p className="text-2xl font-bold tabular-nums">{totalSeconds}</p>
                <p className="text-[11px] text-muted-foreground">120 session-minutes/day quota</p>
              </CardContent>
            </Card>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as (typeof STATUS_FILTERS)[number])}
              className="w-48"
              aria-label="Filter sessions by status"
            >
              {STATUS_FILTERS.map((s) => (
                <SelectItem key={s} value={s}>
                  {s === "all" ? "All statuses" : s}
                </SelectItem>
              ))}
            </Select>
            <Button type="button" variant="outline" size="sm" onClick={() => loadSessions().catch(() => {})}>
              Refresh
            </Button>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,420px)_1fr] gap-6 items-start">
            <Card aria-label="Live session list">
              <CardContent className="pt-4">
                {loading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-12 w-full" aria-label="Loading live sessions" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                ) : sessions.length === 0 ? (
                  <EmptyState
                    icon={<Radio aria-hidden className="h-12 w-12 text-muted-foreground/40" />}
                    title="No live sessions"
                    description="Start a CCTV analysis or operator console session to open a duplex stream."
                  />
                ) : (
                  <ul className="max-h-[560px] overflow-y-auto space-y-1" aria-label="Sessions">
                    {sessions.map((s) => (
                      <li key={s.id}>
                        <button
                          type="button"
                          onClick={() => setSelected(s)}
                          className={`w-full text-left rounded-md px-2 py-2 text-xs hover:bg-accent ${
                            selected?.id === s.id ? "bg-accent font-medium" : ""
                          }`}
                          aria-current={selected?.id === s.id ? "true" : undefined}
                          aria-label={`Open live session ${s.id} (${s.status})`}
                        >
                          <span className="flex items-center justify-between gap-2">
                            <span className="font-mono truncate">{s.id.slice(0, 18)}…</span>
                            <Badge variant={SESSION_STATUS_VARIANT[s.status] || "secondary"} className="text-[10px] shrink-0">
                              {s.status}
                            </Badge>
                          </span>
                          <span className="mt-0.5 block text-[11px] text-muted-foreground">
                            {SESSION_TYPE_LABEL[s.sessionType] || s.sessionType} · {s.totalSeconds}s · {s.totalFrames}{" "}
                            frames · {new Date(s.startedAt).toLocaleString()}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <div className="min-w-0">
              {selected ? (
                <LiveSessionViewer key={selected.id} session={selected} onEnded={() => loadSessions().catch(() => {})} />
              ) : (
                <Card aria-label="Session viewer">
                  <CardContent className="py-16 text-center text-sm text-muted-foreground">
                    Select a session from the list to open its live transcript and hazard feed.
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </>
      )}

      <StartSessionDialog
        open={startOpen}
        onOpenChange={setStartOpen}
        onStarted={(session) => {
          setSelected(session);
          loadSessions().catch(() => {});
        }}
      />
    </div>
  );
}
