"use client";

import { ComingSoon } from "@/components/ui/coming-soon";
import { ShoppingCart } from "lucide-react";

export default function PurchasesPage() {
  return (
    <ComingSoon
      icon={ShoppingCart}
      title="Purchases"
      description="Request purchases, track procurement workflows, and manage multi-stage approval processes."
    />
  );
}
