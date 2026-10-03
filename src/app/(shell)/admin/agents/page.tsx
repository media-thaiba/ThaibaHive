"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAgentsStore } from "@/lib/stores/agents-store";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Bot,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Radio,
  FileCode,
  Activity,
  History,
  Lock,
} from "lucide-react";
import { toast } from "sonner";

export default function AgentsCockpitPage() {
  const {
    agents,
    runs,
    approvalGates,
    telemetryEvents,
    killSwitchEngaged,
    isLoading,
    connectedStream,
    fetchAgents,
    fetchRuns,
    fetchApprovalGates,
    fetchKillSwitchStatus,
    decideApproval,
    toggleKillSwitch,
    initStream,
  } = useAgentsStore();

  const [killswitchConfirmInput, setKillswitchConfirmInput] = useState("");
  const [showKillswitchModal, setShowKillswitchModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchAgents().catch((err) => {
      console.error("Failed to fetch agents:", err);
      toast.error("Failed to fetch agents list");
    });
    fetchRuns().catch((err) => {
      console.error("Failed to fetch runs:", err);
      toast.error("Failed to fetch agent runs");
    });
    fetchApprovalGates().catch((err) => {
      console.error("Failed to fetch approval gates:", err);
      toast.error("Failed to fetch approval gates");
    });
    fetchKillSwitchStatus().catch((err) => {
      console.error("Failed to fetch kill-switch status:", err);
      toast.error("Failed to check kill-switch status");
    });
    const closeStream = initStream();
    return () => closeStream();
  }, [fetchAgents, fetchRuns, fetchApprovalGates, fetchKillSwitchStatus, initStream]);

  const activeRuns = runs.filter((r) => r.status === "running").length;
  const completedRuns = runs.filter((r) => r.status === "completed").length;
  const pendingApprovals = approvalGates.filter((g) => g.status === "pending").length;

  const handleKillSwitch = async (action: "engage" | "disengage") => {
    setActionLoading(true);
    try {
      await toggleKillSwitch(action, killswitchConfirmInput, "Administrator manual command via cockpit");
      toast.success(action === "engage" ? "Kill-switch engaged successfully" : "Kill-switch disengaged");
      setShowKillswitchModal(false);
      setKillswitchConfirmInput("");
    } catch (err: any) {
      console.error("Failed to toggle kill-switch:", err);
      toast.error(err?.message || "Failed to toggle kill-switch");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">Agentic Workflows &amp; Multi-Agent Cockpit</h1>
            <Badge variant={connectedStream ? "success" : "secondary"}>
              <Radio className="mr-1 size-3 animate-pulse" />
              {connectedStream ? "Live Telemetry Connected" : "Telemetry Standby"}
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm">
            Autonomous multi-agent orchestration, approval gates, and institutional safety monitoring.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/admin/agents/workflows">
            <Button variant="outline" size="sm">
              <FileCode className="mr-1.5 size-4" />
              Workflow Catalog
            </Button>
          </Link>
          <Link href="/admin/agents/runs">
            <Button variant="outline" size="sm">
              <History className="mr-1.5 size-4" />
              Execution Logs
            </Button>
          </Link>
          <Link href="/admin/agents/audit">
            <Button variant="outline" size="sm">
              <Lock className="mr-1.5 size-4" />
              Merkle Ledger
            </Button>
          </Link>
          <Button
            variant={killSwitchEngaged ? "destructive" : "outline"}
            size="sm"
            onClick={() => setShowKillswitchModal(true)}
          >
            <ShieldAlert className="mr-1.5 size-4" />
            {killSwitchEngaged ? "Kill-Switch Active" : "Emergency Halt"}
          </Button>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Registered Agents</CardTitle>
            <Bot className="text-muted-foreground size-4" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{agents.length}</div>
            )}
            <p className="text-muted-foreground text-xs">Across 5 specialized domains</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Runs</CardTitle>
            <Activity className="text-muted-foreground size-4" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{activeRuns}</div>
            )}
            <p className="text-muted-foreground text-xs">{completedRuns} completed successfully</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
            <AlertTriangle className="text-warning size-4" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{pendingApprovals}</div>
            )}
            <p className="text-muted-foreground text-xs">Human-in-the-loop gates</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Kill-Switch Guardrail</CardTitle>
            <ShieldAlert className={killSwitchEngaged ? "text-destructive size-4" : "text-success size-4"} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {killSwitchEngaged ? (
                <Badge variant="destructive">HALTED</Badge>
              ) : (
                <Badge variant="success">NOMINAL</Badge>
              )}
            </div>
            <p className="text-muted-foreground text-xs">D12 step-up auth protected</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Grid: Active Agents & Pending Approval Queue */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Active Agents Fleet */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Autonomous Domain Fleet</CardTitle>
            <CardDescription>Real-time agent instances, domain responsibilities, and load concurrency</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
              </div>
            ) : agents.length === 0 ? (
              <div className="text-muted-foreground py-8 text-center text-sm">No agents registered in this tenant.</div>
            ) : (
              <div className="divide-y">
                {agents.map((agent) => (
                  <div key={agent.id} className="flex items-center justify-between py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="bg-primary/10 flex size-9 items-center justify-center rounded-lg">
                        <Bot className="text-primary size-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm">{agent.role}</span>
                          <Badge variant="outline">{agent.domain}</Badge>
                        </div>
                        <p className="text-muted-foreground text-xs font-mono">{agent.id}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="text-xs font-medium">Load: {agent.currentLoad} / {agent.maxConcurrency}</span>
                        <div className="bg-muted h-1.5 w-20 overflow-hidden rounded-full">
                          <div
                            className="bg-primary h-full transition-all"
                            style={{ width: `${Math.min(100, (agent.currentLoad / (agent.maxConcurrency || 1)) * 100)}%` }}
                          />
                        </div>
                      </div>
                      <Badge variant={agent.status === "idle" ? "success" : agent.status === "running" ? "info" : "secondary"}>
                        {agent.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pending Human Approval Gates */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Approval Queue</span>
              {pendingApprovals > 0 && <Badge variant="warning">{pendingApprovals} Pending</Badge>}
            </CardTitle>
            <CardDescription>Critical actions requiring supervisor confirmation</CardDescription>
          </CardHeader>
          <CardContent>
            {approvalGates.length === 0 ? (
              <div className="text-muted-foreground flex flex-col items-center justify-center py-10 text-center">
                <CheckCircle2 className="text-success mb-2 size-8" />
                <p className="text-sm font-medium">All clear</p>
                <p className="text-xs">No pending human-in-the-loop approvals.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {approvalGates.map((gate) => (
                  <div key={gate.id} className="bg-muted/40 rounded-lg border p-3">
                    <div className="flex items-center justify-between">
                      <Badge variant={gate.severity === "critical" ? "destructive" : "warning"}>
                        {gate.severity}
                      </Badge>
                      <span className="text-muted-foreground text-xs font-mono">{gate.id.slice(0, 10)}</span>
                    </div>
                    <p className="mt-2 text-xs font-medium">Run ID: {gate.runId}</p>
                    <p className="text-muted-foreground text-xs">Permission: {gate.requiredPermission}</p>
                    <div className="mt-3 flex gap-2">
                      <Button
                        size="xs"
                        variant="default"
                        className="w-full"
                        onClick={() => decideApproval(gate.id, "approved", "Approved in cockpit")}
                      >
                        Approve
                      </Button>
                      <Button
                        size="xs"
                        variant="destructive"
                        className="w-full"
                        onClick={() => decideApproval(gate.id, "rejected", "Rejected in cockpit")}
                      >
                        Reject
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Live Telemetry Log Stream */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="size-4" />
            Live Agent Event &amp; Telemetry Stream (SSE)
          </CardTitle>
          <CardDescription>Real-time distributed bus messages, tool invocations, and saga state transitions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-muted/60 max-h-60 overflow-y-auto rounded-lg border p-3 font-mono text-xs">
            {telemetryEvents.length === 0 ? (
              <div className="text-muted-foreground py-4 text-center">Listening for agent telemetry events...</div>
            ) : (
              <div className="space-y-1.5">
                {telemetryEvents.map((evt) => (
                  <div key={evt.seq} className="flex items-start gap-2">
                    <span className="text-muted-foreground">#{evt.seq}</span>
                    <span className="text-primary">[{evt.type}]</span>
                    <span className="truncate">{JSON.stringify(evt.data)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Emergency Killswitch Modal */}
      <Dialog open={showKillswitchModal} onOpenChange={(open) => setShowKillswitchModal(open)}>
        <DialogContent className="sm:max-w-md border-red-500/50">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <ShieldAlert className="size-5" />
              Emergency Agent Kill-Switch (D12)
            </DialogTitle>
            <DialogDescription>
              {killSwitchEngaged
                ? "Type 'CONFIRM RESUME AGENTS' to resume autonomous agent operations."
                : "Type 'CONFIRM HALT ALL AGENTS' to immediately pause all autonomous workflows and domain executions."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Input
              className="font-mono text-sm"
              placeholder={killSwitchEngaged ? "CONFIRM RESUME AGENTS" : "CONFIRM HALT ALL AGENTS"}
              value={killswitchConfirmInput}
              onChange={(e) => setKillswitchConfirmInput(e.target.value)}
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setShowKillswitchModal(false)}>
              Cancel
            </Button>
            <Button
              variant={killSwitchEngaged ? "default" : "destructive"}
              size="sm"
              disabled={actionLoading}
              onClick={() => handleKillSwitch(killSwitchEngaged ? "disengage" : "engage")}
            >
              {killSwitchEngaged ? "Resume Operations" : "Halt All Agents"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
