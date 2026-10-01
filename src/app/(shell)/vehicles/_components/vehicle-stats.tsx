"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Truck, Car, Calendar, Gauge } from "lucide-react";
import { cn } from "@/lib/utils";

function MetricCard({
  title,
  value,
  icon: Icon,
  color,
}: {
  title: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold tracking-tight mt-1">{value}</p>
          </div>
          <div className={cn("p-3 rounded-xl", color)}>
            <Icon className="h-6 w-6 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface VehicleStatsProps {
  totalVehicles: number;
  activeFleet: number;
  assignedCount: number;
  totalMileage: number;
}

export function VehicleStats({
  totalVehicles,
  activeFleet,
  assignedCount,
  totalMileage,
}: VehicleStatsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <MetricCard title="Total Vehicles" value={totalVehicles} icon={Truck} color="bg-primary" />
      <MetricCard title="Active Fleet" value={activeFleet} icon={Car} color="bg-success" />
      <MetricCard title="Assigned / In Trip" value={assignedCount} icon={Calendar} color="bg-info" />
      <MetricCard title="Total Mileage (km)" value={Math.round(totalMileage)} icon={Gauge} color="bg-warning" />
    </div>
  );
}
