"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wrench, Calendar, DollarSign } from "lucide-react";
import type { FleetMaintenanceLog } from "./types";

export function MaintenanceTab({ logs }: { logs: FleetMaintenanceLog[] }) {
  if (logs.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground text-sm">
          No vehicle maintenance records logged yet.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {logs.map((log) => (
        <Card key={log.id}>
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-warning/10 text-warning">
                <Wrench className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-semibold text-sm">
                    {log.registrationNumber || "Vehicle"}
                  </span>
                  <Badge variant="warning">{log.serviceType}</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {log.description || "Routine maintenance & inspection"}
                </p>
              </div>
            </div>

            <div className="text-right">
              <div className="flex items-center gap-1 justify-end font-bold text-sm text-foreground">
                <DollarSign className="h-3.5 w-3.5" />
                <span>₹{log.cost.toLocaleString("en-IN")}</span>
              </div>
              <div className="flex items-center gap-1 justify-end text-xs text-muted-foreground mt-0.5">
                <Calendar className="h-3 w-3" />
                <span>{log.maintenanceDate}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
