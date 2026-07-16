"use client";

import { ComingSoon } from "@/components/ui/coming-soon";
import { MessageSquare } from "lucide-react";

export default function GrievancesPage() {
  return (
    <ComingSoon
      icon={MessageSquare}
      title="Feedback"
      description="Submit suggestions, concerns, or anonymous feedback to help improve the workplace."
    />
  );
}
