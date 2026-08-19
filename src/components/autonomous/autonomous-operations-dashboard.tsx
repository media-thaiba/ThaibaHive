"use client";

import React, { useState, useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { SelfHealingMetricsCards, SystemHealthData } from "./self-healing-metrics-cards";
import { RemediationTicketTable, Ticket } from "./remediation-ticket-table";
import { ensureArray } from "@/lib/utils";

export function AutonomousOperationsDashboard() {
  const [health, setHealth] = useState<SystemHealthData | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      const [resHealth, resTickets] = await Promise.all([
        fetch("/api/admin/autonomous/remediations"),
        fetch("/api/admin/autonomous/tickets?limit=20"),
      ]);

      if (!resHealth.ok || !resTickets.ok) {
        throw new Error("Failed to load autonomous operations data");
      }

      const dataHealth = await resHealth.json();
      const dataTickets = await resTickets.json();

      setHealth(dataHealth);
      setTickets(ensureArray(dataTickets.tickets));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error loading dashboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData().catch(() => {
      setError("Failed to initialize dashboard");
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-28 w-full rounded-xl bg-slate-800/60" />
        <Skeleton className="h-64 w-full rounded-xl bg-slate-800/60" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="error">
          <p>{error}</p>
        </Alert>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">
            Autonomous Enterprise Command Center
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Real-time self-healing metrics, automated remediation tickets, and circuit breaker status
          </p>
        </div>
        <Button onClick={() => fetchData()} variant="outline" size="sm">
          Refresh Telemetry
        </Button>
      </div>

      <SelfHealingMetricsCards health={health} />

      <div>
        <h3 className="text-lg font-semibold text-slate-200 mb-3">
          Active Self-Healing Remediation Tickets
        </h3>
        <RemediationTicketTable tickets={tickets} />
      </div>
    </div>
  );
}
