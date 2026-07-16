"use client";

import { ComingSoon } from "@/components/ui/coming-soon";
import { Coffee } from "lucide-react";

export default function CanteenPage() {
  return (
    <ComingSoon
      icon={Coffee}
      title="Canteen"
      description="View daily menus, submit meal preferences, and manage guest counts."
    />
  );
}
