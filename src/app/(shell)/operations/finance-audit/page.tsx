"use client";

import React from "react";
import { AuditTrailPanel } from "@/components/finance/AuditTrailPanel";

export default function FinanceAuditPage() {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Finance Audit Records</h1>
        <p className="text-sm text-muted-foreground">
          Immutable audit trails and financial reporting export center across campuses.
        </p>
      </div>

      <AuditTrailPanel />
    </div>
  );
}
