"use client";

import { ComingSoon } from "@/components/ui/coming-soon";
import { DollarSign } from "lucide-react";

export default function ExpensesPage() {
  return (
    <ComingSoon
      icon={DollarSign}
      title="Expenses"
      description="Submit expense claims, attach receipts, and track reimbursement status through the approval pipeline."
    />
  );
}
