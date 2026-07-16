"use client";

import { ComingSoon } from "@/components/ui/coming-soon";
import { Activity } from "lucide-react";

export default function TimelinePage() {
  return (
    <ComingSoon
      icon={Activity}
      title="Timeline"
      description="See recent activity across your department and stay up to date with what's happening."
    />
  );
}
