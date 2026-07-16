"use client";

import { ComingSoon } from "@/components/ui/coming-soon";
import { Award } from "lucide-react";

export default function RecognitionPage() {
  return (
    <ComingSoon
      icon={Award}
      title="Recognition"
      description="Send kudos to colleagues, celebrate birthdays, and mark work anniversaries."
    />
  );
}
