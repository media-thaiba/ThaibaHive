"use client";

import { ComingSoon } from "@/components/ui/coming-soon";
import { FileText } from "lucide-react";

export default function ReportsPage() {
  return (
    <ComingSoon
      icon={FileText}
      title="Reports"
      description="Submit daily work reports, review team submissions, and export payroll logs — all in one place."
    />
  );
}
