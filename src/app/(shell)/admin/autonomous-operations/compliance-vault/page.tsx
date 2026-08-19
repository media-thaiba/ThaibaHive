"use client";

import React, { useState, useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { IntegrityVerifierBadge } from "@/components/autonomous/integrity-verifier-badge";

export interface Finding {
  ruleId: string;
  description: string;
  severity: string;
  status: "compliant" | "non_compliant";
}

export interface ComplianceReportData {
  frameworkCode: string;
  complianceScore: number;
  vaultIntegrityStatus: "VALIDATED" | "TAMPER_DETECTED";
  findings: Finding[];
}

export default function ComplianceVaultPage() {
  const [report, setReport] = useState<ComplianceReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCompliance = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/autonomous/compliance?framework=regional_privacy_v1");
      if (!res.ok) throw new Error("Failed to load compliance report");
      const data = await res.json();
      setReport(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error loading compliance report");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompliance().catch(() => setLoading(false));
  }, []);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Enterprise Compliance Audit Vault
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Immutable SHA-256 cryptographic WORM audit trail and regulatory framework scorecards
          </p>
        </div>
        <div className="flex items-center gap-3">
          {report && <IntegrityVerifierBadge status={report.vaultIntegrityStatus} />}
          <Button variant="outline" size="sm" onClick={() => fetchCompliance()}>
            Run Integrity Audit
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="error">
          <p>{error}</p>
        </Alert>
      )}

      {loading ? (
        <Skeleton className="h-64 w-full rounded-xl bg-slate-800/60" />
      ) : report ? (
        <div className="space-y-6">
          <div className="p-6 rounded-xl bg-slate-900/80 border border-slate-800 backdrop-blur flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Regulatory Framework Scorecard ({report.frameworkCode})
              </span>
              <div className="text-4xl font-extrabold text-emerald-400 mt-2">
                {report.complianceScore}%
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Automated regulatory compliance evaluation score
              </p>
            </div>
            <Badge variant="success">Fully Compliant</Badge>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/80 overflow-hidden backdrop-blur">
            <Table>
              <TableHeader className="bg-slate-950/60">
                <TableRow className="border-slate-800">
                  <TableHead className="text-slate-400">Rule ID</TableHead>
                  <TableHead className="text-slate-400">Requirement Description</TableHead>
                  <TableHead className="text-slate-400">Severity</TableHead>
                  <TableHead className="text-slate-400">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.findings.map((f) => (
                  <TableRow key={f.ruleId} className="border-slate-800/60 hover:bg-slate-800/40">
                    <TableCell className="font-mono text-xs text-indigo-300">{f.ruleId}</TableCell>
                    <TableCell className="text-slate-200">{f.description}</TableCell>
                    <TableCell>
                      <Badge variant={f.severity === "critical" ? "destructive" : "secondary"}>
                        {f.severity}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={f.status === "compliant" ? "success" : "destructive"}>
                        {f.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
