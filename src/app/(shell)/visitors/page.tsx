"use client";

import { ComingSoon } from "@/components/ui/coming-soon";
import { DoorOpen } from "lucide-react";

export default function VisitorsPage() {
  return (
    <ComingSoon
      icon={DoorOpen}
      title="Visitors"
      description="Pre-register visitors, manage check-in/check-out, and track who's on campus."
    />
  );
}
