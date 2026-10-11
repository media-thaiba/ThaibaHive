"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert } from "@/components/ui/alert";
import { toast } from "sonner";
import { MessageSquare, OctagonX, Radio, Square, Wrench } from "lucide-react";
import {
  HAZARD_SEVERITY_VARIANT,
  SESSION_STATUS_VARIANT,
  SESSION_TYPE_LABEL,
  type HazardEvent,
  type LiveSession,
  type LiveSessionStatus,
  type ToolCallEvent,
  type TranscriptEvent,
} from "./types";

const MAX_EVENTS = 500;

type LiveSessionViewerProps = {
  session: LiveSession;
  onEnded: () => void;
};

export function LiveSessionViewer({ session, onEnded }: LiveSessionViewerProps) {
  const [status, setStatus] = useState<string>(session.status);
  const [transcripts, setTranscripts] = useState<TranscriptEvent[]>([]);
  const [hazards, setHazards] = useState<HazardEvent[]>([]);
  const [toolCalls, setToolCalls] = useState<ToolCallEvent[]>([]);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [stopping, setStopping] = useState(false);
  const sourceRef = useRef<EventSource | null>(null);

  const stopStream = useCallback(() => {
    sourceRef.current?.close();
    sourceRef.current = null;
    setConnected(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setTranscripts([]);
    setHazards([]);
    setToolCalls([]);
    setStreamError(null);
    setConnected(false);
    setStatus(session.status);

    const source = new EventSource(`/api/live/sessions/${session.id}/stream`);
    sourceRef.current = source;

    const appendBounded = <T,>(setter: React.Dispatch<React.SetStateAction<T[]>>, item: T) => {
      setter((prev) => {
        const next = [...prev, item];
        return next.length > MAX_EVENTS ? next.slice(next.length - MAX_EVENTS) : next;
      });
    };

    source.onopen = () => {
      if (!cancelled) setConnected(true);
    };

    source.addEventListener("connected", () => {
      if (!cancelled) setConnected(true);
    });

    source.addEventListener("transcript", (event) => {
      if (cancelled) return;
      try {
        appendBounded(setTranscripts, JSON.parse((event as MessageEvent).data) as TranscriptEvent);
      } catch {
        /* ignore malformed frames */
      }
    });

    source.addEventListener("hazard", (event) => {
      if (cancelled) return;
      try {
        appendBounded(setHazards, JSON.parse((event as MessageEvent).data) as HazardEvent);
      } catch {
        /* ignore malformed frames */
      }
    });

    source.addEventListener("tool_call", (event) => {
      if (cancelled) return;
      try {
        appendBounded(setToolCalls, JSON.parse((event as MessageEvent).data) as ToolCallEvent);
      } catch {
        /* ignore malformed frames */
      }
    });

    source.addEventListener("status", (event) => {
      if (cancelled) return;
      try {
        const payload = JSON.parse((event as MessageEvent).data) as { status: string };
        setStatus(payload.status);
      } catch {
        /* ignore */
      }
    });

    source.addEventListener("session_ended", (event) => {
      if (cancelled) return;
      try {
        const payload = JSON.parse((event as MessageEvent).data) as { status: string };
        setStatus(payload.status);
      } catch {
        /* ignore */
      }
      stopStream();
    });

    source.addEventListener("error", (event) => {
      if (cancelled) return;
      const raw = (event as MessageEvent).data;
      let message = "Stream interrupted";
      if (typeof raw === "string" && raw) {
        try {
          const payload = JSON.parse(raw) as { message?: string; error?: string };
          message = payload.message || payload.error || message;
        } catch {
          message = raw;
        }
      }
      setStreamError(message);
      if (source.readyState === EventSource.CLOSED) {
        setConnected(false);
      }
    });

    return () => {
      cancelled = true;
      source.close();
      sourceRef.current = null;
    };
  }, [session.id, session.status, stopStream]);

  const handleStop = useCallback(async () => {
    setStopping(true);
    try {
      const res = await fetch(`/api/live/sessions/${session.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok && res.status !== 404) {
        toast.error(data.error || "Failed to stop session");
        return;
      }
      setStatus("terminated");
      stopStream();
      toast.success("Session stopped");
      onEnded();
    } catch {
      toast.error("Network error while stopping the session");
    } finally {
      setStopping(false);
    }
  }, [session.id, stopStream, onEnded]);

  const isActive = status === "active" || status === "connecting" || status === "reconnecting";

  return (
    <Card aria-label={`Live session viewer ${session.id}`}>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Radio
              aria-hidden
              className={`h-4 w-4 shrink-0 ${connected && isActive ? "text-success animate-pulse" : "text-muted-foreground"}`}
            />
            <CardTitle className="text-sm font-mono truncate">{session.id}</CardTitle>
            <Badge variant={SESSION_STATUS_VARIANT[(status as LiveSessionStatus) || "active"] || "secondary"} className="text-[10px]">
              {status}
            </Badge>
            <Badge variant="outline" className="text-[10px]">
              {SESSION_TYPE_LABEL[session.sessionType] || session.sessionType}
            </Badge>
            <Badge variant="outline" className="text-[10px]">
              {session.modelId}
            </Badge>
          </div>
          {isActive ? (
            <Button type="button" variant="destructive" size="sm" onClick={handleStop} disabled={stopping}>
              <Square aria-hidden className="mr-1 h-3 w-3" />
              {stopping ? "Stopping…" : "Stop session"}
            </Button>
          ) : (
            <Button type="button" variant="outline" size="sm" onClick={onEnded}>
              Close viewer
            </Button>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground">
          {session.totalSeconds}s streamed · {session.totalFrames} keyframes · {session.totalTokens} tokens ·{" "}
          {connected ? "stream connected" : "stream disconnected"}
        </p>
      </CardHeader>

      <CardContent className="space-y-3">
        {streamError && (
          <Alert variant="warning" role="alert" onDismiss={() => setStreamError(null)}>
            <p className="text-xs">{streamError}</p>
          </Alert>
        )}

        {hazards.length > 0 && (
          <Alert variant="error" role="alert" aria-label="Active hazard alerts">
            <p className="font-semibold text-sm mb-1">
              {hazards.length} hazard{hazards.length === 1 ? "" : "s"} raised this session
            </p>
            <ul className="space-y-1">
              {hazards.slice(-5).reverse().map((h) => (
                <li key={h.id} className="flex items-start gap-2 text-xs">
                  <OctagonX aria-hidden className="mt-0.5 h-3 w-3 shrink-0" />
                  <span>
                    <Badge variant={HAZARD_SEVERITY_VARIANT[h.severity] || "info"} className="mr-1.5 text-[10px]">
                      {h.severity}
                    </Badge>
                    <strong>{h.hazardType}</strong> — {h.description} ({Math.round(h.confidence * 100)}%)
                  </span>
                </li>
              ))}
            </ul>
          </Alert>
        )}

        <Tabs defaultValue="transcript">
          <TabsList>
            <TabsTrigger value="transcript">
              <MessageSquare aria-hidden className="mr-1 h-3 w-3" />
              Transcript ({transcripts.length})
            </TabsTrigger>
            <TabsTrigger value="hazards">
              <OctagonX aria-hidden className="mr-1 h-3 w-3" />
              Hazards ({hazards.length})
            </TabsTrigger>
            <TabsTrigger value="tools">
              <Wrench aria-hidden className="mr-1 h-3 w-3" />
              Tool calls ({toolCalls.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="transcript">
            <div
              className="max-h-[420px] min-h-[160px] overflow-y-auto rounded-lg border p-3 space-y-2"
              aria-live="polite"
              aria-label="Live transcript feed"
            >
              {transcripts.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">Waiting for the first transcript…</p>
              ) : (
                transcripts.map((t) => (
                  <p key={t.id} className="text-xs">
                    <span
                      className={
                        t.speaker === "user"
                          ? "font-semibold text-info"
                          : t.speaker === "agent"
                            ? "font-semibold text-success"
                            : "font-semibold text-muted-foreground"
                      }
                    >
                      {t.speaker}
                      {!t.isFinal ? " …" : ":"}
                    </span>{" "}
                    <span className="text-foreground">{t.text}</span>
                    <span className="ml-2 text-[10px] text-muted-foreground">
                      {new Date(t.timestamp).toLocaleTimeString()}
                    </span>
                  </p>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="hazards">
            <div className="max-h-[420px] min-h-[160px] overflow-y-auto rounded-lg border p-3 space-y-2" aria-label="Hazard log">
              {hazards.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">No hazards detected.</p>
              ) : (
                hazards
                  .slice()
                  .reverse()
                  .map((h) => (
                    <div key={h.id} className="rounded-md border p-2">
                      <div className="flex items-center justify-between gap-2">
                        <Badge variant={HAZARD_SEVERITY_VARIANT[h.severity] || "info"} className="text-[10px]">
                          {h.severity}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(h.timestamp).toLocaleTimeString()} · {Math.round(h.confidence * 100)}%
                        </span>
                      </div>
                      <p className="mt-1 text-xs">
                        <strong>{h.hazardType}</strong> — {h.description}
                      </p>
                    </div>
                  ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="tools">
            <div className="max-h-[420px] min-h-[160px] overflow-y-auto rounded-lg border p-3 space-y-2" aria-label="Tool call log">
              {toolCalls.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">No tool calls yet.</p>
              ) : (
                toolCalls
                  .slice()
                  .reverse()
                  .map((t) => (
                    <div key={t.id} className="rounded-md border p-2">
                      <p className="flex items-center justify-between gap-2 text-xs">
                        <strong className="font-mono">{t.toolName}</strong>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(t.timestamp).toLocaleTimeString()}
                        </span>
                      </p>
                      <pre className="mt-1 overflow-x-auto text-[10px] text-muted-foreground">
                        {JSON.stringify(t.parameters, null, 2)}
                      </pre>
                    </div>
                  ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
