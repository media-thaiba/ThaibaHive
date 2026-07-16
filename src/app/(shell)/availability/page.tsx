"use client";

import { ComingSoon } from "@/components/ui/coming-soon";
import { CircleDot } from "lucide-react";

export default function AvailabilityPage() {
  return (
    <ComingSoon
      icon={CircleDot}
      title="Availability"
      description="Set your availability status for team visibility and see who's available right now."
    />
  );
}
