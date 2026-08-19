"use client";

import React, { useEffect, useState, useCallback } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AtRiskTable, type AtRiskRecord } from "../_components/at-risk-table";
import { InterventionModal } from "../_components/intervention-modal";
import Link from "next/link";

export default function EarlyWarningPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [records, setRecords] = useState<AtRiskRecord[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<AtRiskRecord | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [filterDomain, setFilterDomain] = useState<string>("all");

  const fetchEarlyWarnings = useCallback(() => {
    setLoading(true);
    setError(null);

    Promise.all([
      fetch("/api/admin/ai/predictions/attendance").then((res) => res.json()),
      fetch("/api/admin/ai/predictions/fees").then((res) => res.json()),
      fetch("/api/admin/ai/predictions/academic").then((res) => res.json()),
    ])
      .then(([attData, feeData, acadData]) => {
        const combined: AtRiskRecord[] = [];

        if (attData.predictions) {
          attData.predictions.forEach((p: { studentId: string; studentName?: string; riskLevel: string; confidenceScore: number; riskFactors: string[] }) => {
            if (p.riskLevel !== "low") {
              combined.push({
                studentId: p.studentId,
                studentName: p.studentName || p.studentId,
                domain: "attendance",
                predictionType: "chronic_absenteeism",
                riskLevel: p.riskLevel as "medium" | "high" | "critical",
                confidenceScore: p.confidenceScore,
                riskFactors: p.riskFactors,
              });
            }
          });
        }

        if (feeData.forecast?.predictions) {
          feeData.forecast.predictions.forEach((p: { studentId: string; studentName?: string; riskLevel: string; confidenceScore: number; riskFactors: string[] }) => {
            if (p.riskLevel !== "low") {
              combined.push({
                studentId: p.studentId,
                studentName: p.studentName || p.studentId,
                domain: "fees",
                predictionType: "fee_default",
                riskLevel: p.riskLevel as "medium" | "high" | "critical",
                confidenceScore: p.confidenceScore,
                riskFactors: p.riskFactors,
              });
            }
          });
        }

        if (acadData.predictions) {
          acadData.predictions.forEach((p: { studentId: string; studentName?: string; riskLevel: string; confidenceScore: number; riskFactors: string[] }) => {
            if (p.riskLevel !== "low") {
              combined.push({
                studentId: p.studentId,
                studentName: p.studentName || p.studentId,
                domain: "academic",
                predictionType: "academic_risk",
                riskLevel: p.riskLevel as "medium" | "high" | "critical",
                confidenceScore: p.confidenceScore,
                riskFactors: p.riskFactors,
              });
            }
          });
        }

        setRecords(combined);
      })
      .catch((err) => {
        console.error("[Early Warning Page Error]", err);
        setError(err instanceof Error ? err.message : "Failed to load early warning data");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    fetchEarlyWarnings();
  }, [fetchEarlyWarnings]);

  const handleIntervene = (record: AtRiskRecord) => {
    setSelectedRecord(record);
    setModalOpen(true);
  };

  const handleSaveIntervention = (data: { counselorName: string; actionPlan: string }) => {
    alert(`Intervention recorded for ${selectedRecord?.studentName}: Assigned to ${data.counselorName}. Action Plan: "${data.actionPlan}"`);
  };

  const filteredRecords = filterDomain === "all"
    ? records
    : records.filter((r) => r.domain === filterDomain);

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <PageHeader title="Early Warning & Student Intervention Center" description="Loading risk assessments..." />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader
          title="Early Warning & Student Intervention Center"
          description="Identify at-risk students across Attendance, Fee Payment, and Academic Performance trajectories"
        />
        <Link href="/admin/ai-analytics">
          <Button variant="outline">Back to AI Analytics</Button>
        </Link>
      </div>

      {error && (
        <Alert variant="error">
          <p>{error}</p>
        </Alert>
      )}

      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-muted-foreground">Filter Domain:</span>
        <Button
          size="sm"
          variant={filterDomain === "all" ? "default" : "outline"}
          onClick={() => setFilterDomain("all")}
        >
          All ({records.length})
        </Button>
        <Button
          size="sm"
          variant={filterDomain === "attendance" ? "default" : "outline"}
          onClick={() => setFilterDomain("attendance")}
        >
          Attendance ({records.filter((r) => r.domain === "attendance").length})
        </Button>
        <Button
          size="sm"
          variant={filterDomain === "fees" ? "default" : "outline"}
          onClick={() => setFilterDomain("fees")}
        >
          Fees ({records.filter((r) => r.domain === "fees").length})
        </Button>
        <Button
          size="sm"
          variant={filterDomain === "academic" ? "default" : "outline"}
          onClick={() => setFilterDomain("academic")}
        >
          Academic ({records.filter((r) => r.domain === "academic").length})
        </Button>
      </div>

      <AtRiskTable records={filteredRecords} onIntervene={handleIntervene} />

      <InterventionModal
        record={selectedRecord}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSaveIntervention}
      />
    </div>
  );
}
