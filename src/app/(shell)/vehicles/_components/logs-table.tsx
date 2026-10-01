"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Fuel, Trash2 } from "lucide-react";
import type { VehicleLog } from "./types";

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" });
}

interface LogsTableProps {
  logs: VehicleLog[];
  onLogTrip: () => void;
  onDeleteLog: (id: string) => void;
}

export function LogsTable({ logs, onLogTrip, onDeleteLog }: LogsTableProps) {
  if (logs.length === 0) {
    return (
      <EmptyState
        icon={<Fuel className="h-12 w-12" />}
        title="No trip logs found"
        description="Log a trip to see mileage records here."
        action={{ label: "Log Trip", onClick: onLogTrip }}
      />
    );
  }

  return (
    <div className="rounded-lg border overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Vehicle</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider hidden sm:table-cell">Date</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider hidden md:table-cell">Odometer</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Fuel</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider hidden xl:table-cell">Route</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {logs.map((l) => (
            <tr key={l.id} className="hover:bg-muted/30 transition-colors">
              <td className="px-4 py-3">
                <p className="font-medium font-mono text-sm">{l.vehicleReg || "—"}</p>
                <p className="text-xs text-muted-foreground">
                  {l.driverName ? `${l.driverName} ${l.driverLastName || ""}`.trim() : ""}
                </p>
              </td>
              <td className="px-4 py-3 hidden sm:table-cell text-sm">{formatDate(l.date)}</td>
              <td className="px-4 py-3 hidden md:table-cell">
                <div className="text-sm">
                  {l.startOdometer != null && l.endOdometer != null ? (
                    <>
                      <span>{l.startOdometer.toLocaleString()} → {l.endOdometer.toLocaleString()} km</span>
                      {l.distanceKm != null && (
                        <span className="ml-2 text-muted-foreground">({l.distanceKm.toLocaleString()} km)</span>
                      )}
                    </>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </div>
              </td>
              <td className="px-4 py-3 hidden lg:table-cell">
                <div className="text-sm">
                  {l.fuelLitres != null ? <span>{l.fuelLitres} L</span> : <span className="text-muted-foreground">—</span>}
                  {l.fuelCost != null && <span className="ml-2 text-muted-foreground">₹{l.fuelCost.toLocaleString()}</span>}
                </div>
              </td>
              <td className="px-4 py-3 hidden xl:table-cell">
                <span className="text-sm truncate max-w-[200px] block">{l.route || "—"}</span>
              </td>
              <td className="px-4 py-3 text-right">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => onDeleteLog(l.id)}
                  className="h-8 w-8 text-destructive"
                  aria-label="Delete log"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
