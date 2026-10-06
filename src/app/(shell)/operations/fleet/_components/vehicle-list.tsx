"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2, Truck, Gauge } from "lucide-react";
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

export function VehicleList({
  vehicles,
  onDelete,
}: {
  vehicles: Vehicle[];
  onDelete: (id: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {vehicles.map((v) => (
        <Card key={v.id} className="relative group overflow-hidden">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <span className="font-mono text-lg font-bold text-primary">
                  {v.registrationNumber}
                </span>
                <p className="text-sm font-medium text-foreground mt-0.5">{v.model}</p>
              </div>
              <div className="flex items-center gap-1.5">
                {getFuelBadge(v.fuelType)}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => onDelete(v.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Truck className="h-3.5 w-3.5" />
                <span className="capitalize">{v.type}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Gauge className="h-3.5 w-3.5" />
                <span>Cap: {v.capacity} passengers</span>
              </div>
            </div>
            {v.notes && (
              <p className="text-xs text-muted-foreground mt-2 line-clamp-1 italic">
                {v.notes}
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
