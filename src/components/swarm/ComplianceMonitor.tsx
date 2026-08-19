"use client";

import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export interface ComplianceFinding {
  id: string;
  framework: string;
  ruleName: string;
  severity: "critical" | "high" | "medium" | "low";
  status: "failed" | "passed" | "pending";
  description: string;
  createdAt: string;
}

interface ComplianceMonitorProps {
  findings: ComplianceFinding[];
  onTriggerRemediation?: (findingId: string) => void;
}

const STATIC_SEED_TIME = 1718000000000;

const DEFAULT_FINDINGS: ComplianceFinding[] = [
  {
    id: "f1",
    framework: "GDPR",
    ruleName: "DATA_ENCRYPTION_REST",
    severity: "critical" as const,
    status: "failed" as const,
    description: "Tenant database storage encryption key rotation check failed.",
    createdAt: new Date(STATIC_SEED_TIME).toISOString(),
  },
  {
    id: "f2",
    framework: "SOC2",
    ruleName: "ACCESS_CONTROL_MFA",
    severity: "high" as const,
    status: "failed" as const,
    description: "Super Admin account accessed without valid multi-factor verification.",
    createdAt: new Date(STATIC_SEED_TIME - 300000).toISOString(),
  },
  {
    id: "f3",
    framework: "HIPAA",
    ruleName: "AUDIT_LOG_INTEGRITY",
    severity: "medium" as const,
    status: "passed" as const,
    description: "Verify write-ahead log hashes are aligned with the integrity checksums.",
    createdAt: new Date(STATIC_SEED_TIME - 86400000).toISOString(),
  },
];

export const ComplianceMonitor: React.FC<ComplianceMonitorProps> = ({ findings, onTriggerRemediation }) => {
  const [selectedFinding, setSelectedFinding] = useState<ComplianceFinding | null>(null);

  const displayFindings = findings.length > 0 ? findings : DEFAULT_FINDINGS;

  const getSeverityVariant = (severity: string) => {
    switch (severity.toLowerCase()) {
      case "critical":
      case "high":
        return "destructive";
      case "medium":
        return "warning";
      default:
        return "secondary";
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case "passed":
        return "success";
      case "failed":
        return "destructive";
      default:
        return "secondary";
    }
  };

  return (
    <Card className="col-span-3 border-border bg-card">
      <CardHeader>
        <CardTitle className="text-xl font-bold flex items-center justify-between">
          Continuous Compliance Monitor
          <Badge variant="destructive">
            {displayFindings.filter((f) => f.status === "failed").length} Violations Active
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-5 gap-2 text-center text-xs">
          {["GDPR", "HIPAA", "SOC2", "FERPA", "MoE"].map((fw) => {
            const hasFail = displayFindings.some((f) => f.framework === fw && f.status === "failed");
            return (
              <div key={fw} className={`p-3 rounded border ${hasFail ? "border-destructive/30 bg-destructive/5" : "border-success/30 bg-success/5"}`}>
                <div className="font-bold text-foreground mb-1">{fw}</div>
                <Badge variant={hasFail ? "destructive" : "success"}>
                  {hasFail ? "FAILED" : "PASSED"}
                </Badge>
              </div>
            );
          })}
        </div>

        <div className="space-y-2">
          <span className="text-sm font-semibold text-muted-foreground">Active Compliance Violations:</span>
          {displayFindings.map((finding) => (
            <div
              key={finding.id}
              className="p-3 border border-border rounded flex items-center justify-between hover:bg-muted/30 cursor-pointer"
              onClick={() => setSelectedFinding(finding)}
            >
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="font-mono font-bold text-sm">{finding.ruleName}</span>
                  <Badge variant={getSeverityVariant(finding.severity)}>{finding.severity.toUpperCase()}</Badge>
                  <Badge variant={getStatusVariant(finding.status)}>{finding.status.toUpperCase()}</Badge>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-1">{finding.description}</p>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-xs text-muted-foreground">{new Date(finding.createdAt).toLocaleTimeString()}</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>

      <Dialog open={!!selectedFinding} onOpenChange={(open) => !open && setSelectedFinding(null)}>
        {selectedFinding && (
          <DialogContent className="sm:max-w-md border-border bg-card">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                Violation Details: {selectedFinding.ruleName}
                <Badge variant={getSeverityVariant(selectedFinding.severity)}>{selectedFinding.severity.toUpperCase()}</Badge>
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4 text-sm text-foreground">
              <div className="grid grid-cols-3 gap-2">
                <span className="text-muted-foreground font-semibold">Framework:</span>
                <span className="col-span-2 font-mono font-bold">{selectedFinding.framework}</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <span className="text-muted-foreground font-semibold">Description:</span>
                <span className="col-span-2">{selectedFinding.description}</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <span className="text-muted-foreground font-semibold">Status:</span>
                <span className="col-span-2">
                  <Badge variant={getStatusVariant(selectedFinding.status)}>{selectedFinding.status.toUpperCase()}</Badge>
                </span>
              </div>
              {selectedFinding.status === "failed" && onTriggerRemediation && (
                <div className="mt-4 flex justify-end">
                  <Button
                    variant="default"
                    onClick={() => {
                      if (selectedFinding && onTriggerRemediation) {
                        onTriggerRemediation(selectedFinding.id);
                        setSelectedFinding(null);
                      }
                    }}
                  >
                    Trigger Self-Healing Remediation
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
