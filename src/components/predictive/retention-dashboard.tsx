"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RetentionPredictionResult } from "@/lib/predictive/student-retention-predictor";

interface RetentionDashboardProps {
  predictions: RetentionPredictionResult[];
  highRiskCount: number;
  moderateRiskCount: number;
  lowRiskCount: number;
}

export function RetentionDashboard({
  predictions,
  highRiskCount,
  moderateRiskCount,
  lowRiskCount,
}: RetentionDashboardProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-destructive">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">High Risk Students</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{highRiskCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Requires immediate intervention</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Moderate Risk Students</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{moderateRiskCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Requires proactive monitoring</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Low Risk Students</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{lowRiskCount}</div>
            <p className="text-xs text-muted-foreground mt-1">On track for successful term</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>At-Risk Student Risk Scoring Directory</CardTitle>
          <p className="text-sm text-muted-foreground">
            Normalized retention risk scores computed via logistic sigmoid inference engine.
          </p>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student Name</TableHead>
                <TableHead>Risk Category</TableHead>
                <TableHead>Risk Score</TableHead>
                <TableHead>Contributing Factors</TableHead>
                <TableHead>Recommended Interventions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {predictions.map((p) => (
                <TableRow key={p.studentId}>
                  <TableCell className="font-medium">{p.studentName}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        p.riskCategory === "HIGH"
                          ? "destructive"
                          : p.riskCategory === "MODERATE"
                          ? "warning"
                          : "success"
                      }
                    >
                      {p.riskCategory}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono">{p.atRiskScore.toFixed(4)}</TableCell>
                  <TableCell className="text-xs space-y-1">
                    {p.contributingFactors.map((f, idx) => (
                      <div key={idx} className="text-muted-foreground">• {f}</div>
                    ))}
                  </TableCell>
                  <TableCell className="text-xs font-medium">
                    {p.recommendedInterventions.map((i, idx) => (
                      <div key={idx} className="text-primary">• {i}</div>
                    ))}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
