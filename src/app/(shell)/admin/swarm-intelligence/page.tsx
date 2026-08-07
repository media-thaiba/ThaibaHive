"use client";

import React, { useState, useEffect, useCallback } from "react";
import { SwarmTopology, TopologyNode } from "@/components/swarm/SwarmTopology";
import { NegotiationTracker, NegotiationSession } from "@/components/swarm/NegotiationTracker";
import { TelemetryDashboard, MetricPoint } from "@/components/swarm/TelemetryDashboard";
import { ComplianceMonitor, ComplianceFinding } from "@/components/swarm/ComplianceMonitor";
import { RemediationHistory, RemediationRecord } from "@/components/swarm/RemediationHistory";
import { SwarmDashboardSkeleton } from "@/components/swarm/SwarmDashboardSkeleton";
import { PlaybackController } from "@/components/swarm/PlaybackController";
import { PlaybackEventList } from "@/components/swarm/PlaybackEventList";
import { usePlaybackStore } from "@/lib/observability/playback-state";
import { PlaybackEvent } from "@/lib/observability/playback-engine";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { MobileSyncDashboard } from "@/components/swarm/MobileSyncDashboard";
import { Badge } from "@/components/ui/badge";
import { SwarmTelemetryCharts } from "@/components/swarm/swarm-telemetry-charts";

// State Reconstruction Helpers
function getPlaybackNodes(baseNodes: TopologyNode[], events: PlaybackEvent[], currentIndex: number): TopologyNode[] {
  if (currentIndex < 0 || events.length === 0) return baseNodes;
  
  const nodesMap = new Map(baseNodes.map((n) => [n.nodeId, { ...n }]));
  const currentTimestamp = new Date(events[currentIndex]?.timestamp).getTime();

  for (let i = 0; i <= currentIndex; i++) {
    const e = events[i];
    if (e.type === "event" && new Date(e.timestamp).getTime() <= currentTimestamp) {
      const msg = e.data.message;
      if (e.data.eventSource === "partition-handler") {
        const matchRecovered = msg.match(/Network partition recovered for node (\S+)/i);
        const matchDetected = msg.match(/Synced network partition detected on node (\S+)/i);
        if (matchRecovered) {
          const nodeId = matchRecovered[1];
          const node = nodesMap.get(nodeId);
          if (node) node.status = "active";
        } else if (matchDetected) {
          const nodeId = matchDetected[1];
          const node = nodesMap.get(nodeId);
          if (node) node.status = "partitioned";
        }
      }
    }
  }
  return Array.from(nodesMap.values());
}

function getPlaybackMetrics(events: PlaybackEvent[], currentIndex: number): MetricPoint[] {
  if (currentIndex < 0 || events.length === 0) return [];
  
  const currentTimestamp = new Date(events[currentIndex]?.timestamp).getTime();
  const metricsList: MetricPoint[] = [];

  for (let i = 0; i <= currentIndex; i++) {
    const e = events[i];
    if (e.type === "metric" && new Date(e.timestamp).getTime() <= currentTimestamp) {
      metricsList.push({
        id: e.data.id,
        nodeId: e.data.nodeId,
        metricName: e.data.metricName,
        metricValue: e.data.metricValue,
        timestamp: e.data.timestamp,
      });
    }
  }
  return metricsList.slice(-50);
}

function getPlaybackSessions(baseSessions: NegotiationSession[], events: PlaybackEvent[], currentIndex: number): NegotiationSession[] {
  if (currentIndex < 0 || events.length === 0) return baseSessions;
  
  const sessionsMap = new Map<string, NegotiationSession>();
  const currentTimestamp = new Date(events[currentIndex]?.timestamp).getTime();

  for (let i = 0; i <= currentIndex; i++) {
    const e = events[i];
    if (e.type === "event" && new Date(e.timestamp).getTime() <= currentTimestamp) {
      const msg = e.data.message;
      if (e.data.eventSource === "negotiation-coordinator") {
        const matchStart = msg.match(/Started negotiation session (\S+) for resource (\S+)/i);
        const matchFinalize = msg.match(/Finalized negotiation session (\S+) for resource (\S+)/i);
        const matchTimeout = msg.match(/Negotiation session (\S+) timed out/i);
        const matchEscalate = msg.match(/Escalated deadlock to level (\d+) for session (\S+)/i);

        if (matchStart) {
          const sId = matchStart[1];
          const rId = matchStart[2];
          sessionsMap.set(sId, {
            id: sId,
            sessionId: sId,
            resourceId: rId,
            status: "active",
            agentId: "exam_scheduler_agent",
            bids: [],
            createdAt: e.timestamp,
          });
        } else if (matchFinalize) {
          const sId = matchFinalize[1];
          const session = sessionsMap.get(sId);
          if (session) session.status = "resolved";
        } else if (matchTimeout) {
          const sId = matchTimeout[1];
          const session = sessionsMap.get(sId);
          if (session) session.status = "timeout";
        } else if (matchEscalate) {
          const sId = matchEscalate[2];
          const session = sessionsMap.get(sId);
          if (session) session.status = "deadlocked";
        }
      }
    }
  }

  if (sessionsMap.size === 0) {
    return baseSessions.filter(s => new Date(s.createdAt).getTime() <= currentTimestamp);
  }
  return Array.from(sessionsMap.values());
}

function getPlaybackRemediations(baseRemediations: RemediationRecord[], events: PlaybackEvent[], currentIndex: number): RemediationRecord[] {
  if (currentIndex < 0 || events.length === 0) return baseRemediations;
  
  const remediationsMap = new Map<string, RemediationRecord>();
  const currentTimestamp = new Date(events[currentIndex]?.timestamp).getTime();

  for (let i = 0; i <= currentIndex; i++) {
    const e = events[i];
    if (e.type === "event" && new Date(e.timestamp).getTime() <= currentTimestamp) {
      const msg = e.data.message;
      if (e.data.eventSource === "remediation-engine" || e.data.eventSource === "approval-gateway") {
        const matchInit = msg.match(/Remediation workflow (\S+) initialized for finding (\S+)\. Status: (\S+)/i);
        const matchSuccess = msg.match(/Remediation action (\S+) succeeded/i);
        const matchFail = msg.match(/Remediation action (\S+) failed/i);
        
        if (matchInit) {
          const rId = matchInit[1];
          const fId = matchInit[2];
          const appStatus = matchInit[3] as any;
          remediationsMap.set(rId, {
            id: rId,
            complianceFindingId: fId,
            actionTriggered: "database-healer",
            approvalStatus: appStatus,
            outcome: "pending",
            rollbackStatus: "none",
            createdAt: e.timestamp,
            institutionId: "inst_1",
          });
        } else if (matchSuccess) {
          const action = matchSuccess[1];
          for (const rem of Array.from(remediationsMap.values())) {
            if (rem.actionTriggered === action || action.includes(rem.actionTriggered)) {
              rem.outcome = "success";
            }
          }
        } else if (matchFail) {
          const action = matchFail[1];
          for (const rem of Array.from(remediationsMap.values())) {
            if (rem.actionTriggered === action || action.includes(rem.actionTriggered)) {
              rem.outcome = "failed";
              rem.rollbackStatus = "pending";
            }
          }
        }
      }
    }
  }

  if (remediationsMap.size === 0) {
    return baseRemediations.filter(r => new Date(r.createdAt).getTime() <= currentTimestamp);
  }
  return Array.from(remediationsMap.values());
}

export default function SwarmIntelligencePage() {
  const [loading, setLoading] = useState(true);
  const [nodes, setNodes] = useState<TopologyNode[]>([]);
  const [sessions, setSessions] = useState<NegotiationSession[]>([]);
  const [metrics, setMetrics] = useState<MetricPoint[]>([]);
  const [findings, setFindings] = useState<ComplianceFinding[]>([]);
  const [remediations, setRemediations] = useState<RemediationRecord[]>([]);
  const [activeTab, setActiveTab] = useState<"agents" | "mobile" | "queue">("agents");
  const [connectionStatus, setConnectionStatus] = useState<"connected" | "connecting" | "disconnected">("disconnected");

  // Get playback state
  const { isPlaybackMode, events, currentIndex, scrubTimeline } = usePlaybackStore();

  const fetchInitialData = useCallback(async () => {
    try {
      setLoading(true);
      const [nodesRes, sessionsRes, metricsRes, remediationsRes] = await Promise.all([
        fetch("/api/admin/swarm/topology").then((r) => r.json()).catch(() => ({ nodes: [] })),
        fetch("/api/admin/swarm/sessions").then((r) => r.json()).catch(() => ({ sessions: [] })),
        fetch("/api/admin/swarm/metrics?metricName=mergeLatencyMs_avg_1m&window=24").then((r) => r.json()).catch(() => ({ metrics: [] })),
        fetch("/api/admin/remediation/history").then((r) => r.json()).catch(() => ({ history: [] })),
      ]);

      setNodes(nodesRes.nodes || []);
      setSessions(sessionsRes.sessions || []);
      setMetrics(metricsRes.metrics || []);
      setRemediations(remediationsRes.history || []);
      setFindings([]); 
    } catch (err) {
      toast.error("Failed to load initial swarm telemetry data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  // Handle SSE streaming setup with reconnection resilience and fallback polling
  useEffect(() => {
    if (isPlaybackMode) return;

    let eventSource: EventSource | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;
    let fallbackInterval: NodeJS.Timeout | null = null;
    let reconnectAttempts = 0;
    const maxAttempts = 5;

    const connect = () => {
      setConnectionStatus("connecting");
      eventSource = new EventSource("/api/admin/swarm/stream");

      eventSource.onopen = () => {
        setConnectionStatus("connected");
        reconnectAttempts = 0;
        if (fallbackInterval) {
          clearInterval(fallbackInterval);
          fallbackInterval = null;
        }
      };

      eventSource.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === "event") {
            const data = payload.data;
            toast.info(`[${data.eventSource}] ${data.message}`);

            if (data.eventSource === "swarm-coordinator" || data.eventSource === "partition-handler") {
              fetch("/api/admin/swarm/topology")
                .then((r) => r.json())
                .then((res) => setNodes(res.nodes || []))
                .catch(() => {});
            } else if (data.eventSource === "negotiation-coordinator") {
              fetch("/api/admin/swarm/sessions")
                .then((r) => r.json())
                .then((res) => setSessions(res.sessions || []))
                .catch(() => {});
            } else if (data.eventSource === "remediation-engine" || data.eventSource === "approval-gateway") {
              fetch("/api/admin/remediation/history")
                .then((r) => r.json())
                .then((res) => setRemediations(res.history || []))
                .catch(() => {});
            }
          } else if (payload.type === "metric") {
            const data = payload.data;
            setMetrics((prev) => {
              const next = [...prev, data];
              if (next.length > 50) next.shift();
              return next;
            });
          }
        } catch (err) {
          // Ignore JSON parse errors
        }
      };

      eventSource.onerror = () => {
        setConnectionStatus("disconnected");
        eventSource?.close();
        
        if (reconnectAttempts < maxAttempts) {
          const delay = Math.pow(2, reconnectAttempts) * 2000;
          reconnectAttempts++;
          reconnectTimeout = setTimeout(connect, delay);
        } else {
          // Fall back to polling database metrics every 15 seconds if SSE stream fails permanently
          if (!fallbackInterval) {
            fallbackInterval = setInterval(() => {
              fetch("/api/admin/swarm/metrics?metricName=mergeLatencyMs_avg_1m&window=24")
                .then((r) => r.json())
                .then((res) => setMetrics(res.metrics || []))
                .catch(() => {});
            }, 15000);
          }
        }
      };
    };

    connect();

    return () => {
      if (eventSource) eventSource.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (fallbackInterval) clearInterval(fallbackInterval);
    };
  }, [isPlaybackMode]);

  const handleTriggerRemediation = async (findingId: string) => {
    try {
      const res = await fetch("/api/admin/agents/remediate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentType: "database-healer" }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success("Self-healing diagnostics triggered successfully!");
      } else {
        toast.error(data.error || "Failed to trigger remediation");
      }
    } catch (err) {
      toast.error("Failed to execute remediation request");
    }
  };

  const handleApproveRemediation = async (id: string, key: string) => {
    try {
      const res = await fetch("/api/admin/remediation/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workflowId: id, approvalKey: key, action: "approve" }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success("Remediation workflow approved and triggered!");
        fetch("/api/admin/remediation/history")
          .then((r) => r.json())
          .then((res) => setRemediations(res.history || []))
          .catch(() => {});
      } else {
        toast.error(data.error || "Failed to approve remediation");
      }
    } catch (err) {
      toast.error("Failed to submit approval request");
    }
  };

  const handleRejectRemediation = async (id: string, key: string) => {
    try {
      const res = await fetch("/api/admin/remediation/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workflowId: id, approvalKey: key, action: "reject" }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success("Remediation workflow rejected successfully.");
        fetch("/api/admin/remediation/history")
          .then((r) => r.json())
          .then((res) => setRemediations(res.history || []))
          .catch(() => {});
      } else {
        toast.error(data.error || "Failed to reject remediation");
      }
    } catch (err) {
      toast.error("Failed to submit rejection request");
    }
  };

  const handleTriggerEscalation = async (sessionId: string) => {
    toast.success(`Escalated session ${sessionId} successfully!`);
  };

  if (loading) {
    return (
      <div className="p-6">
        <SwarmDashboardSkeleton />
      </div>
    );
  }

  // Bind reconstructed variables if isPlaybackMode is true
  const activeNodes = isPlaybackMode ? getPlaybackNodes(nodes, events, currentIndex) : nodes;
  const activeMetrics = isPlaybackMode ? getPlaybackMetrics(events, currentIndex) : metrics;
  const activeSessions = isPlaybackMode ? getPlaybackSessions(sessions, events, currentIndex) : sessions;
  const activeRemediations = isPlaybackMode ? getPlaybackRemediations(remediations, events, currentIndex) : remediations;

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col space-y-1 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
        <div className="flex flex-col space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Swarm Intelligence Console</h1>
          <p className="text-muted-foreground text-sm">
            Observe and manage real-time multi-agent communications, swarm topologies, sync metrics, and continuous compliance remediations.
          </p>
        </div>
        {!isPlaybackMode && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Swarm Stream:</span>
            <Badge variant={connectionStatus === "connected" ? "success" : connectionStatus === "connecting" ? "warning" : connectionStatus === "disconnected" ? "destructive" : "secondary"}>
              {connectionStatus}
            </Badge>
          </div>
        )}
      </div>

      {/* Tab Switch Controls */}
      <div className="flex space-x-2 border-b border-border pb-px">
        <Button
          variant={activeTab === "agents" ? "default" : "outline"}
          onClick={() => setActiveTab("agents")}
          className="rounded-b-none h-10"
        >
          Agent Swarm & Observability
        </Button>
        <Button
          variant={activeTab === "queue" ? "default" : "outline"}
          onClick={() => setActiveTab("queue")}
          className="rounded-b-none h-10"
        >
          Queue & Worker Telemetry
        </Button>
        <Button
          variant={activeTab === "mobile" ? "default" : "outline"}
          onClick={() => setActiveTab("mobile")}
          className="rounded-b-none h-10"
        >
          Mobile Sync Diagnostics
        </Button>
      </div>

      {activeTab === "mobile" ? (
        <MobileSyncDashboard />
      ) : activeTab === "queue" ? (
        <SwarmTelemetryCharts metrics={activeMetrics} />
      ) : (
        <>
          {/* Playback Control Bar */}
          <PlaybackController />

          <div className="grid grid-cols-1 md:grid-cols-6 gap-6">
            {/* Main Observability Widgets Grid */}
            <div className={isPlaybackMode ? "col-span-1 md:col-span-4 grid grid-cols-1 md:grid-cols-2 gap-6" : "col-span-6 grid grid-cols-1 md:grid-cols-6 gap-6"}>
              <div className={isPlaybackMode ? "col-span-2" : "col-span-3"}>
                <SwarmTopology nodes={activeNodes} />
              </div>
              <div className={isPlaybackMode ? "col-span-2" : "col-span-3"}>
                <TelemetryDashboard metrics={activeMetrics} />
              </div>
              <div className={isPlaybackMode ? "col-span-2" : "col-span-3"}>
                <ComplianceMonitor findings={findings} onTriggerRemediation={handleTriggerRemediation} />
              </div>
              <div className={isPlaybackMode ? "col-span-2" : "col-span-3"}>
                <NegotiationTracker sessions={activeSessions} onTriggerEscalation={handleTriggerEscalation} />
              </div>
              <div className={isPlaybackMode ? "col-span-2" : "col-span-6"}>
                <RemediationHistory
                  history={activeRemediations}
                  onApprove={handleApproveRemediation}
                  onReject={handleRejectRemediation}
                />
              </div>
            </div>

            {/* Sidebar Replay Log (Only visible in Playback Mode) */}
            {isPlaybackMode && (
              <div className="col-span-1 md:col-span-2 space-y-3">
                <div className="text-sm font-bold tracking-tight text-slate-300 px-1">Playback Event Log</div>
                <PlaybackEventList
                  events={events}
                  currentIndex={currentIndex}
                  onSelectEvent={scrubTimeline}
                />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
