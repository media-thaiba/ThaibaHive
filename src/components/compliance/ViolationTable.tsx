"use client";

import React, { useState } from "react";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ComplianceViolationRecord, ViolationSeverity, ViolationStatus } from "@/lib/compliance/types";
import { AlertCircle, Check, Eye } from "lucide-react";

interface ViolationTableProps {
  violations: ComplianceViolationRecord[];
  onUpdateStatus?: (id: string, status: ViolationStatus, notes?: string) => Promise<void>;
  loading?: boolean;
}

export function ViolationTable({ violations, onUpdateStatus, loading }: ViolationTableProps) {
  const [selectedViolation, setSelectedViolation] = useState<ComplianceViolationRecord | null>(null);
  const [targetStatus, setTargetStatus] = useState<ViolationStatus>("RESOLVED");
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleOpenTriage = (v: ComplianceViolationRecord) => {
    setSelectedViolation(v);
    setTargetStatus(v.status === "OPEN" ? "ACKNOWLEDGED" : "RESOLVED");
    setResolutionNotes(v.resolutionNotes || "");
  };

  const handleSaveStatus = async () => {
    if (!selectedViolation || !onUpdateStatus) return;
    try {
      setSubmitting(true);
      await onUpdateStatus(selectedViolation.id, targetStatus, resolutionNotes);
      setSelectedViolation(null);
    } finally {
      setSubmitting(false);
    }
  };

  const getSeverityBadgeVariant = (sev: ViolationSeverity) => {
    switch (sev) {
      case "CRITICAL":
        return "destructive";
      case "HIGH":
        return "warning";
      case "MEDIUM":
        return "info";
      default:
        return "secondary";
    }
  };

  const getStatusBadgeVariant = (st: ViolationStatus) => {
    switch (st) {
      case "RESOLVED":
      case "FALSE_POSITIVE":
        return "success";
      case "ACKNOWLEDGED":
        return "warning";
      default:
        return "destructive";
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Severity</TableHead>
              <TableHead>Rule Violation</TableHead>
              <TableHead>Actor / Subject</TableHead>
              <TableHead>Detected At</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {violations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-6 text-muted-foreground text-sm">
                  {loading ? "Loading compliance violations..." : "🎉 No compliance violations recorded."}
                </TableCell>
              </TableRow>
            ) : (
              violations.map((v) => (
                <TableRow key={v.id}>
                  <TableCell>
                    <Badge variant={getSeverityBadgeVariant(v.severity)}>
                      {v.severity}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium text-sm">
                    {v.details?.ruleName || v.ruleId}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {v.actorId || "Anonymous / System"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(v.createdAt).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(v.status)}>
                      {v.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenTriage(v)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Triage
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {selectedViolation && (
        <Dialog open={Boolean(selectedViolation)} onOpenChange={(open) => !open && setSelectedViolation(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base">
                <AlertCircle className="h-5 w-5 text-amber-500" />
                Compliance Incident Triage: {selectedViolation.id}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-2 text-sm">
              <div className="p-3 bg-muted/40 rounded border border-border text-xs space-y-1">
                <div>
                  <strong>Rule:</strong> {selectedViolation.ruleId}
                </div>
                <div>
                  <strong>Severity:</strong> {selectedViolation.severity}
                </div>
                <div>
                  <strong>Actor:</strong> {selectedViolation.actorId || "System"}
                </div>
                <div>
                  <strong>Details:</strong>{" "}
                  <pre className="mt-1 p-2 bg-background rounded text-[11px] font-mono overflow-auto max-h-32">
                    {JSON.stringify(selectedViolation.details, null, 2)}
                  </pre>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium">Update Status</label>
                <Select
                  value={targetStatus}
                  onChange={(e) => setTargetStatus(e.target.value as ViolationStatus)}
                >
                  <option value="OPEN">OPEN</option>
                  <option value="ACKNOWLEDGED">ACKNOWLEDGED</option>
                  <option value="RESOLVED">RESOLVED</option>
                  <option value="FALSE_POSITIVE">FALSE POSITIVE</option>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium">Resolution Notes</label>
                <Textarea
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="Document review notes, justification, or remediation actions taken..."
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedViolation(null)}>
                Cancel
              </Button>
              <Button onClick={handleSaveStatus} disabled={submitting}>
                <Check className="h-4 w-4 mr-1" />
                {submitting ? "Updating..." : "Save Resolution"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
