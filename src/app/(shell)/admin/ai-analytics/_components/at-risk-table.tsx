"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RiskFactorBadge } from "./risk-factor-badge";
import { ensureArray } from "@/lib/utils";

export interface AtRiskRecord {
  studentId: string;
  studentName: string;
  domain: string;
  predictionType: string;
  riskLevel: "low" | "medium" | "high" | "critical";
  confidenceScore: number;
  riskFactors: string[];
}

interface AtRiskTableProps {
  records: AtRiskRecord[];
  onIntervene: (record: AtRiskRecord) => void;
}

export function AtRiskTable({ records, onIntervene }: AtRiskTableProps) {
  const safeRecords = ensureArray<AtRiskRecord>(records);

  if (safeRecords.length === 0) {
    return (
      <div className="p-8 text-center border rounded-lg bg-card text-muted-foreground">
        ✨ No high-risk student anomalies detected across current prediction models.
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-x-auto bg-card shadow-sm">
      <table className="w-full text-sm text-left">
        <thead className="bg-muted/50 text-xs uppercase font-medium text-muted-foreground border-b">
          <tr>
            <th className="px-4 py-3">Student Name</th>
            <th className="px-4 py-3">Domain / Category</th>
            <th className="px-4 py-3">Risk Level</th>
            <th className="px-4 py-3">Confidence</th>
            <th className="px-4 py-3">Primary Risk Factors</th>
            <th className="px-4 py-3 text-right">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {safeRecords.map((item, idx) => (
            <tr key={idx} className="hover:bg-muted/30 transition-colors">
              <td className="px-4 py-3 font-semibold text-foreground">{item.studentName || item.studentId}</td>
              <td className="px-4 py-3">
                <Badge variant="outline" className="capitalize">{item.domain}</Badge>
              </td>
              <td className="px-4 py-3">
                <RiskFactorBadge riskLevel={item.riskLevel} />
              </td>
              <td className="px-4 py-3 font-medium">{Math.round(item.confidenceScore * 100)}%</td>
              <td className="px-4 py-3 text-xs text-muted-foreground max-w-md">
                <ul className="list-disc list-inside space-y-0.5">
                  {ensureArray<string>(item.riskFactors).slice(0, 2).map((factor, fIdx) => (
                    <li key={fIdx}>{String(factor)}</li>
                  ))}
                </ul>
              </td>
              <td className="px-4 py-3 text-right">
                <Button size="sm" variant="default" onClick={() => onIntervene(item)}>
                  Record Action
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
