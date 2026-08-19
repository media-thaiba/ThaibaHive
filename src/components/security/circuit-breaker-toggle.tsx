/**
 * Gateway Circuit Breaker State & Manual Toggle Widget
 * Sprint-038 / AGS-013
 */

"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface CircuitBreakerToggleProps {
  state: "CLOSED" | "OPEN" | "HALF_OPEN";
  onOverride: (action: "TRIP" | "RESET", reason?: string) => Promise<boolean>;
}

export function CircuitBreakerToggle({ state, onOverride }: CircuitBreakerToggleProps) {
  const getBadgeVariant = () => {
    switch (state) {
      case "CLOSED":
        return "success";
      case "HALF_OPEN":
        return "warning";
      case "OPEN":
        return "destructive";
    }
  };

  const getStateDescription = () => {
    switch (state) {
      case "CLOSED":
        return "Gateway operational. Normal traffic routing active across all institution endpoints.";
      case "HALF_OPEN":
        return "Recovery trial mode. Monitoring probe latency and shedding unverified queries.";
      case "OPEN":
        return "Emergency Degraded Mode Active. Public queries shed to protect critical staff transactions.";
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-semibold">Gateway Circuit Breaker</CardTitle>
        <Badge variant={getBadgeVariant()}>{state}</Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">{getStateDescription()}</p>
        <div className="flex gap-2">
          {state === "CLOSED" ? (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => onOverride("TRIP", "Manual operator trip via Admin Threat Radar")}
            >
              Emergency Trip to Degraded Mode
            </Button>
          ) : (
            <Button
              variant="default"
              size="sm"
              onClick={() => onOverride("RESET", "Manual operator reset")}
            >
              Restore Normal Mode (Reset)
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
