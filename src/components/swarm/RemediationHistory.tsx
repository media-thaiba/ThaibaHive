"use client";

import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export interface RemediationRecord {
  id: string;
  complianceFindingId: string;
  actionTriggered: string;
  approvalKey?: string;
  approvalStatus: "pending" | "approved" | "rejected" | "none";
  outcome: "pending" | "success" | "failed";
  rollbackStatus: "none" | "pending" | "success" | "failed";
  createdAt: string;
  institutionId: string;
}

interface RemediationHistoryProps {
  history: RemediationRecord[];
  onApprove?: (id: string, key: string) => void;
  onReject?: (id: string, key: string) => void;
}

const STATIC_SEED_TIME = 1718000000000;

const DEFAULT_HISTORY: RemediationRecord[] = [
  {
    id: "rem_1",
    complianceFindingId: "f1",
    actionTriggered: "database-healer",
    approvalKey: "app_9912",
    approvalStatus: "pending" as const,
    outcome: "pending" as const,
    rollbackStatus: "none" as const,
    createdAt: new Date(STATIC_SEED_TIME).toISOString(),
    institutionId: "inst_1"
  },
  {
    id: "rem_2",
    complianceFindingId: "f2",
    actionTriggered: "pool-healer",
    approvalKey: "app_1241",
    approvalStatus: "approved" as const,
    outcome: "success" as const,
    rollbackStatus: "none" as const,
    createdAt: new Date(STATIC_SEED_TIME - 3600000).toISOString(),
    institutionId: "inst_1"
  }
];

export const RemediationHistory: React.FC<RemediationHistoryProps> = ({ history, onApprove, onReject }) => {
  const [selectedRecord, setSelectedRecord] = useState<RemediationRecord | null>(null);

  const displayHistory = history.length > 0 ? history : DEFAULT_HISTORY;

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "success":
      case "approved":
        return <Badge variant="success">{status.toUpperCase()}</Badge>;
      case "failed":
      case "rejected":
        return <Badge variant="destructive">{status.toUpperCase()}</Badge>;
      case "pending":
        return <Badge variant="warning">{status.toUpperCase()}</Badge>;
      default:
        return <Badge variant="secondary">{status.toUpperCase()}</Badge>;
    }
  };

  return (
    <Card className="col-span-3 border-border bg-card">
      <CardHeader>
        <CardTitle className="text-xl font-bold flex items-center justify-between">
          Remediation Workflows History
          <Badge variant="info">Audit Trail</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          {displayHistory.map((record) => (
            <div
              key={record.id}
              className="p-3 border border-border rounded flex items-center justify-between hover:bg-muted/30 cursor-pointer"
              onClick={() => setSelectedRecord(record)}
            >
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-sm font-semibold">{record.actionTriggered}</span>
                  {getStatusBadge(record.outcome)}
                </div>
                <div className="text-xs text-muted-foreground">
                  Workflow: <span className="font-mono">{record.id}</span>
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                {new Date(record.createdAt).toLocaleTimeString()}
              </div>
            </div>
          ))}
        </div>
      </CardContent>

      <Dialog open={!!selectedRecord} onOpenChange={(open) => !open && setSelectedRecord(null)}>
        {selectedRecord && (
          <DialogContent className="sm:max-w-md border-border bg-card">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                Remediation Workflow details
                {getStatusBadge(selectedRecord.outcome)}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4 text-sm text-foreground">
              <div className="grid grid-cols-3 gap-2">
                <span className="text-muted-foreground font-semibold">Workflow ID:</span>
                <span className="col-span-2 font-mono">{selectedRecord.id}</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <span className="text-muted-foreground font-semibold">Action:</span>
                <span className="col-span-2 capitalize">{selectedRecord.actionTriggered}</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <span className="text-muted-foreground font-semibold">Approval status:</span>
                <span className="col-span-2">{getStatusBadge(selectedRecord.approvalStatus)}</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <span className="text-muted-foreground font-semibold">Rollback status:</span>
                <span className="col-span-2">{getStatusBadge(selectedRecord.rollbackStatus)}</span>
              </div>
              {selectedRecord.approvalStatus === "pending" && onApprove && onReject && selectedRecord.approvalKey && (
                <div className="mt-4 flex justify-end space-x-2 border-t pt-4">
                  <Button
                    variant="destructive"
                    onClick={() => {
                      if (selectedRecord && onReject && selectedRecord.approvalKey) {
                        onReject(selectedRecord.id, selectedRecord.approvalKey);
                        setSelectedRecord(null);
                      }
                    }}
                  >
                    Reject Remediation
                  </Button>
                  <Button
                    variant="default"
                    onClick={() => {
                      if (selectedRecord && onApprove && selectedRecord.approvalKey) {
                        onApprove(selectedRecord.id, selectedRecord.approvalKey);
                        setSelectedRecord(null);
                      }
                    }}
                  >
                    Approve & Execute
                  </Button>
                </div>
              )}
            </div>
          </DialogContent>
        )}
      </Dialog>
    </Card>
  );
};
