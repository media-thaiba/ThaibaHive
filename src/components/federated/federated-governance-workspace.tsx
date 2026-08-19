"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert } from "@/components/ui/alert";
import { ensureArray } from "@/lib/utils";

interface PolicyItem {
  id: string;
  tenantId: string;
  title: string;
  category: string;
  status: "DRAFT" | "PROPAGATING" | "ACTIVE" | "CONFLICT" | "SUPERSEDED";
  version: number;
  sha256Hash: string;
  updatedAt: string;
}

interface CircuitState {
  serviceName: string;
  state: "CLOSED" | "OPEN" | "HALF_OPEN";
  failureRate: number;
  medianLatencyMs: number;
}

export function FederatedGovernanceWorkspace() {
  const [policies, setPolicies] = useState<PolicyItem[]>([]);
  const [circuit, setCircuit] = useState<CircuitState | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const fetchData = useCallback(() => {
    setLoading(true);
    setError(null);

    Promise.all([
      fetch("/api/admin/federated/policies").then((res) => res.json()),
      fetch("/api/admin/resilience/circuit-breaker").then((res) => res.json()),
    ])
      .then(([polData, cbData]) => {
        setPolicies(ensureArray(polData?.policies));
        setCircuit(cbData?.circuitState || null);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Failed to load governance workspace data");
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleResetCircuit = () => {
    fetch("/api/admin/resilience/circuit-breaker", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reset" }),
    })
      .then((res) => res.json())
      .then((data) => {
        setActionMessage(data.message || "Circuit reset");
        fetchData();
      })
      .catch((err) => setError(err.message));
  };

  const handleTripCircuit = () => {
    fetch("/api/admin/resilience/circuit-breaker", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "trip" }),
    })
      .then((res) => res.json())
      .then((data) => {
        setActionMessage(data.message || "Circuit tripped");
        fetchData();
      })
      .catch((err) => setError(err.message));
  };

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Federated Governance & Self-Healing Center</h1>
        <Button variant="outline" onClick={fetchData}>
          Refresh Hub
        </Button>
      </div>

      {error && (
        <Alert variant="error">
          <span>{error}</span>
        </Alert>
      )}

      {actionMessage && (
        <Alert variant="info">
          <span>{actionMessage}</span>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="col-span-1 md:col-span-2">
          <CardHeader>
            <CardTitle>Cross-Institutional Policy Replication Status</CardTitle>
          </CardHeader>
          <CardContent>
            {policies.length === 0 ? (
              <p className="text-sm text-muted-foreground">No active federated policies found across institutions.</p>
            ) : (
              <div className="space-y-3">
                {policies.map((p) => (
                  <div key={p.id} className="flex items-center justify-between border-b pb-2">
                    <div>
                      <div className="font-semibold text-sm">{p.title}</div>
                      <div className="text-xs text-muted-foreground">
                        Category: {p.category} | Version: v{p.version} | SHA-256: {p.sha256Hash.substring(0, 10)}...
                      </div>
                    </div>
                    <Badge
                      variant={
                        p.status === "ACTIVE"
                          ? "success"
                          : p.status === "PROPAGATING"
                          ? "info"
                          : p.status === "CONFLICT"
                          ? "destructive"
                          : "secondary"
                      }
                    >
                      {p.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Query Circuit Breaker</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {circuit ? (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Status:</span>
                  <Badge
                    variant={
                      circuit.state === "CLOSED"
                        ? "success"
                        : circuit.state === "HALF_OPEN"
                        ? "warning"
                        : "destructive"
                    }
                  >
                    {circuit.state}
                  </Badge>
                </div>
                <div className="text-sm space-y-1">
                  <div>Service: {circuit.serviceName}</div>
                  <div>Failure Rate: {Math.round(circuit.failureRate * 100)}%</div>
                  <div>Median Latency: {circuit.medianLatencyMs} ms</div>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm" onClick={handleResetCircuit}>
                    Reset Circuit
                  </Button>
                  <Button variant="destructive" size="sm" onClick={handleTripCircuit}>
                    Manual Trip
                  </Button>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Circuit breaker offline or unconfigured.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
