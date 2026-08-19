"use client";

import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExportDialog } from "@/components/export-dialog";
import { ApprovalHistory, ApprovalHistoryItem } from "./ApprovalHistory";
import { FileSpreadsheet, ShieldCheck } from "lucide-react";

interface AuditTrailPanelProps {
  requestId?: string;
  history?: ApprovalHistoryItem[];
}

export function AuditTrailPanel({ requestId, history = [] }: AuditTrailPanelProps) {
  const [showExportDialog, setShowExportDialog] = useState(false);

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between border-b pb-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-500" />
          <h3 className="font-semibold text-sm">Immutable Audit Trail</h3>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowExportDialog(true)}
          className="flex items-center gap-1 text-xs"
        >
          <FileSpreadsheet className="w-3.5 h-3.5" /> Export Audit Log
        </Button>
      </div>

      <ApprovalHistory history={history} />

      {showExportDialog && (
        <ExportDialog
          open={showExportDialog}
          onOpenChange={setShowExportDialog}
          type="accounts"
          title="Export Finance Audit Trail"
        />
      )}
    </Card>
  );
}
