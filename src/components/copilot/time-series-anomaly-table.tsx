"use client";

import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export interface AnomalyItem {
  index: number;
  value: number;
  expectedValue: number;
  sigmaDeviation: number;
  type: "positive_anomaly" | "negative_anomaly";
}

export interface TimeSeriesAnomalyTableProps {
  anomalies: AnomalyItem[];
}

export function TimeSeriesAnomalyTable({ anomalies }: TimeSeriesAnomalyTableProps) {
  return (
    <div className="rounded-md border border-slate-700 bg-slate-900 p-4">
      <h3 className="mb-4 text-base font-semibold text-white">Statistical Residual Anomalies (&gt;= 2.5 Sigma)</h3>
      {anomalies.length === 0 ? (
        <p className="text-sm text-slate-400">No statistically significant residual anomalies detected.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="border-slate-800 hover:bg-slate-900">
              <TableHead className="text-slate-300">Month Index</TableHead>
              <TableHead className="text-slate-300">Observed Value</TableHead>
              <TableHead className="text-slate-300">Expected Value</TableHead>
              <TableHead className="text-slate-300">Sigma Deviation</TableHead>
              <TableHead className="text-slate-300">Anomaly Type</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {anomalies.map((anom, idx) => (
              <TableRow key={idx} className="border-slate-800 hover:bg-slate-800/50">
                <TableCell className="font-medium text-slate-200">Month #{anom.index + 1}</TableCell>
                <TableCell className="text-slate-200">${anom.value.toLocaleString()}</TableCell>
                <TableCell className="text-slate-200">${anom.expectedValue.toLocaleString()}</TableCell>
                <TableCell className="text-slate-200">{anom.sigmaDeviation}σ</TableCell>
                <TableCell>
                  <Badge variant={anom.type === "negative_anomaly" ? "destructive" : "success"}>
                    {anom.type === "negative_anomaly" ? "Negative Revenue Deficit" : "Positive Revenue Spike"}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
