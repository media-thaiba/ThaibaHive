"use client";

import React, { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { ComplianceRadarCard } from "@/components/compliance/ComplianceRadarCard";
import { AuditIntegrityCard } from "@/components/compliance/AuditIntegrityCard";
import { SnapshotTimelineCard } from "@/components/compliance/SnapshotTimelineCard";
import { ViolationTable } from "@/components/compliance/ViolationTable";
import { RegulatoryExportModal } from "@/components/compliance/RegulatoryExportModal";
import { SnapshotDiffModal } from "@/components/compliance/SnapshotDiffModal";
import { TelemetrySummary, ComplianceViolationRecord, ViolationStatus } from "@/lib/compliance/types";
import { FileText, ShieldCheck } from "lucide-react";

export default function AdminCompliancePage() {
  const [telemetry, setTelemetry] = useState<TelemetrySummary | null>(null);
  const [violations, setViolations] = useState<ComplianceViolationRecord[]>([]);
  const [snapshots, setSnapshots] = useState<any[]>([]);
  const [verificationResult, setVerificationResult] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [diffModalOpen, setDiffModalOpen] = useState(false);

  const fetchData = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetch("/api/system/compliance/telemetry").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/system/compliance/violations").then((r) => (r.ok ? r.json() : { violations: [] })),
      fetch("/api/system/compliance/snapshots").then((r) => (r.ok ? r.json() : { snapshots: [] })),
    ])
      .then(([telemetryData, violationsData, snapshotsData]) => {
        if (telemetryData) setTelemetry(telemetryData);
        if (violationsData?.violations) setViolations(violationsData.violations);
        if (snapshotsData?.snapshots) setSnapshots(snapshotsData.snapshots);
      })
      .catch((err) => {
        console.error("[AdminCompliancePage] Error fetching compliance data:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleVerifyAuditChain = async () => {
    try {
      const res = await fetch("/api/system/compliance/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId: "all" }),
      });
      if (res.ok) {
        const json = await res.json();
        setVerificationResult(json);
      }
    } catch (err) {
      console.error("[AdminCompliancePage] Error verifying audit chain:", err);
    }
  };

  const handleCaptureSnapshot = async () => {
    try {
      const res = await fetch("/api/system/compliance/snapshots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ snapshotType: "MANUAL" }),
      });
      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error("[AdminCompliancePage] Error capturing snapshot:", err);
    }
  };

  const handleUpdateViolationStatus = async (
    id: string,
    status: ViolationStatus,
    notes?: string
  ) => {
    try {
      const res = await fetch(`/api/system/compliance/violations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, resolutionNotes: notes }),
      });
      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error("[AdminCompliancePage] Error updating violation:", err);
    }
  };

  const handleGenerateExport = async (standard: "SOC2" | "ISO27001" | "GDPR" | "HIPAA") => {
    const res = await fetch("/api/system/compliance/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ standard, format: "json" }),
    });
    if (!res.ok) {
      throw new Error("Failed to generate regulatory export");
    }
    return res.json();
  };

  const handleComputeDiff = async (baseSnapshotUri: string, targetSnapshotUri: string) => {
    const res = await fetch("/api/system/compliance/snapshots/diff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ baseSnapshotUri, targetSnapshotUri }),
    });
    if (!res.ok) {
      throw new Error("Failed to compute snapshot difference");
    }
    return res.json();
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader
          title="Enterprise Compliance & Forensic Governance"
          description="Real-time compliance telemetry, SHA-256 Merkle audit verification, and forensic snapshots"
        />
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setExportModalOpen(true)}
            className="flex items-center gap-1.5"
          >
            <FileText className="h-4 w-4" />
            Export Dossier
          </Button>
          <Button
            size="sm"
            onClick={handleVerifyAuditChain}
            className="flex items-center gap-1.5"
          >
            <ShieldCheck className="h-4 w-4" />
            Verify Audit Trail
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <ComplianceRadarCard telemetry={telemetry} loading={loading} />
        <AuditIntegrityCard
          verificationResult={verificationResult}
          onVerify={handleVerifyAuditChain}
          loading={loading}
        />
        <SnapshotTimelineCard
          snapshots={snapshots}
          onCaptureSnapshot={handleCaptureSnapshot}
          onOpenDiffModal={() => setDiffModalOpen(true)}
          loading={loading}
        />
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">Real-Time Violation Radar</h2>
        <ViolationTable
          violations={violations}
          onUpdateStatus={handleUpdateViolationStatus}
          loading={loading}
        />
      </div>

      <RegulatoryExportModal
        open={exportModalOpen}
        onOpenChange={setExportModalOpen}
        onGenerateExport={handleGenerateExport}
      />

      <SnapshotDiffModal
        open={diffModalOpen}
        onOpenChange={setDiffModalOpen}
        snapshots={snapshots}
        onComputeDiff={handleComputeDiff}
      />
    </div>
  );
}
