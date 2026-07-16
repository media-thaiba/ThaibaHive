"use client";

import { ComingSoon } from "@/components/ui/coming-soon";
import { FileText } from "lucide-react";

export default function AccountsPage() {
  return (
    <ComingSoon
      icon={FileText}
      title="Accounts"
      description="View institutional income, expenses, and financial summaries across all departments."
    />
  );
}
