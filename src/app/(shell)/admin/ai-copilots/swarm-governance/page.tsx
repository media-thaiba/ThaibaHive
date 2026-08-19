"use client";

import React, { useState, useEffect } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { SwarmTopologyView } from "@/components/copilot/swarm-topology-view";
import { RedisHealthBadge } from "@/components/copilot/redis-health-badge";
import { CircuitBreakerControlTable } from "@/components/copilot/circuit-breaker-control-table";

export default function SwarmGovernancePage() {
  const [redisStatus, setRedisStatus] = useState<"CONNECTED" | "IN_MEMORY_FALLBACK">("IN_MEMORY_FALLBACK");
  const [mode, setMode] = useState("single_node_fallback");
  const [circuitState, setCircuitState] = useState<any>({ state: "CLOSED", failures: 0 });

  const fetchState = React.useCallback(async () => {
    try {
      const res = await fetch("/api/admin/copilots/state?tenantId=inst_101&feature=copilot_query");
      if (res.ok) {
        const json = await res.json();
        setRedisStatus(json.redisStatus);
        setMode(json.mode);
        setCircuitState(json.circuitState);
      }
    } catch {
      // Catch fetch error
    }
  }, []);

  useEffect(() => {
    fetchState();
  }, [fetchState]);

  const handleAction = async (action: "trip" | "reset") => {
    try {
      const res = await fetch("/api/admin/copilots/state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId: "inst_101", feature: "copilot_query", action }),
      });
      if (res.ok) {
        fetchState();
      }
    } catch {
      // Catch
    }
  };

  return (
    <div className="container mx-auto space-y-6 p-6">
      <div className="flex items-center justify-between">
        <PageHeader
          title="Agent Swarm Governance & Redis Health Hub"
          description="Operational management of multi-agent swarm topologies, circuit breaker threshold monitoring, and Redis connection state."
        />
        <RedisHealthBadge redisStatus={redisStatus} mode={mode} />
      </div>

      <SwarmTopologyView />

      <CircuitBreakerControlTable
        feature="copilot_query"
        state={circuitState.state || "CLOSED"}
        failureCount={circuitState.failures || 0}
        onTrip={() => handleAction("trip")}
        onReset={() => handleAction("reset")}
      />
    </div>
  );
}
