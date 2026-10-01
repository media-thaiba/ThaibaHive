"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Truck } from "lucide-react";
import type { Vehicle } from "./types";

function getFuelBadge(fuelType: string) {
  const map: Record<string, { variant: "success" | "info" | "warning" | "secondary"; label: string }> = {
    electric: { variant: "success", label: "Electric" },
    hybrid: { variant: "info", label: "Hybrid" },
    diesel: { variant: "warning", label: "Diesel" },
    petrol: { variant: "secondary", label: "Petrol" },
  };
  const match = map[fuelType.toLowerCase()] || { variant: "secondary" as const, label: fuelType };
  return <Badge variant={match.variant}>{match.label}</Badge>;
}

interface FleetTableProps {
  vehicles: Vehicle[];
  hasFilter: boolean;
  onAddVehicle: () => void;
}

export function FleetTable({ vehicles, hasFilter, onAddVehicle }: FleetTableProps) {
  if (vehicles.length === 0) {
    return (
      <EmptyState
        icon={<Truck className="h-12 w-12" />}
        title="No vehicles found"
        description={hasFilter ? "No vehicles match your filters." : "Add your first vehicle to get started."}
        action={!hasFilter ? { label: "Add Vehicle", onClick: onAddVehicle } : undefined}
      />
    );
  }

  return (
    <div className="rounded-lg border overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Vehicle</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider hidden md:table-cell">Type</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Fuel</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Capacity</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider hidden xl:table-cell">Institution</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {vehicles.map((v) => (
            <tr key={v.id} className="hover:bg-muted/30 transition-colors">
              <td className="px-4 py-3">
                <div>
                  <p className="font-medium font-mono text-sm">{v.registrationNumber}</p>
                  <p className="text-xs text-muted-foreground">{v.model}</p>
                </div>
              </td>
              <td className="px-4 py-3 hidden md:table-cell">
                <span className="text-sm capitalize">{v.type}</span>
              </td>
              <td className="px-4 py-3 hidden lg:table-cell">{getFuelBadge(v.fuelType)}</td>
              <td className="px-4 py-3 hidden lg:table-cell">
                <span className="text-sm">{v.capacity} seats</span>
              </td>
              <td className="px-4 py-3 hidden xl:table-cell">
                <span className="text-sm">{v.institutionName || "—"}</span>
              </td>
              <td className="px-4 py-3">
                <Badge variant={v.isActive ? "success" : "secondary"}>
                  {v.isActive ? "Active" : "Inactive"}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
