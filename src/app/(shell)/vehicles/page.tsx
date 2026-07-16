"use client";

import { ComingSoon } from "@/components/ui/coming-soon";
import { Truck } from "lucide-react";

export default function VehiclesPage() {
  return (
    <ComingSoon
      icon={Truck}
      title="Vehicles"
      description="Book institutional vehicles, view fleet status, and manage daily ride logs."
    />
  );
}
