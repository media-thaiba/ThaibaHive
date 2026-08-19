"use client";

import React, { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ClassAnalyticsPanel } from "./ClassAnalyticsPanel";

interface TabulationRegisterProps {
  examId?: string;
  onExportClick?: () => void;
}

export function TabulationRegister({ examId = "exam_100", onExportClick }: TabulationRegisterProps) {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!examId) return;
    setIsLoading(true);
    fetch(`/api/examinations/tabulation?examId=${examId}`)
      .then((res) => res.json())
      .then((resData) => {
        setData(resData);
      })
      .catch((err) => console.error(err))
      .finally(() => setIsLoading(false));
  }, [examId]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const { exam, schedules = [], tabulation = [], analytics } = data || {};

  const getResultBadge = (status: string) => {
    switch (status) {
      case "pass":
        return <Badge variant="success">PASS</Badge>;
      case "compartment":
        return <Badge variant="warning">COMPARTMENT</Badge>;
      case "fail":
        return <Badge variant="destructive">FAIL</Badge>;
      default:
        return <Badge variant="secondary">PENDING</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Export Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border rounded-lg bg-card">
        <div>
          <h2 className="text-xl font-bold">{exam?.title || "Examination Tabulation Register"}</h2>
          <p className="text-xs text-muted-foreground">
            Academic Term: {exam?.academicYear} ({exam?.term}) | Total Candidates: {tabulation.length}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {onExportClick && (
            <Button variant="outline" onClick={onExportClick}>
              Export Tabulation Register
            </Button>
          )}
        </div>
      </div>

      {/* Analytics Summary */}
      {analytics && <ClassAnalyticsPanel analytics={analytics} />}

      {/* Tabulation Matrix Table */}
      <div className="border rounded-lg overflow-x-auto bg-card">
        <table className="w-full text-xs text-left border-collapse min-w-[700px]">
          <thead className="bg-muted/50 font-semibold uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-3 w-12">Rank</th>
              <th className="px-3 py-3">Roll No & Student Name</th>
              {schedules.map((s: any) => (
                <th key={s.id} className="px-3 py-3 text-center">
                  {s.subjectName}
                </th>
              ))}
              <th className="px-3 py-3 text-center font-bold">Total</th>
              <th className="px-3 py-3 text-center font-bold">% Score</th>
              <th className="px-3 py-3 text-center font-bold">SGPA</th>
              <th className="px-3 py-3 text-center font-bold">Result</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {tabulation.length === 0 ? (
              <tr>
                <td colSpan={6 + schedules.length} className="text-center py-8 text-muted-foreground">
                  No tabulation records found.
                </td>
              </tr>
            ) : (
              tabulation.map((row: any) => (
                <tr key={row.studentId} className="hover:bg-muted/30">
                  <td className="px-3 py-3 font-bold text-center">#{row.rank}</td>
                  <td className="px-3 py-3 font-medium">
                    <div className="text-foreground">{row.name}</div>
                    <div className="text-[10px] text-muted-foreground font-mono">{row.rollNumber}</div>
                  </td>
                  {schedules.map((s: any) => {
                    const subResult = row.subjects?.find((sub: any) => sub.subjectName === s.subjectName);
                    return (
                      <td key={s.id} className="px-3 py-3 text-center">
                        {subResult ? (
                          subResult.isAbsent ? (
                            <span className="text-destructive font-semibold">ABS</span>
                          ) : (
                            <span>{subResult.marksObtained ?? "-"}</span>
                          )
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                    );
                  })}
                  <td className="px-3 py-3 text-center font-bold">{row.totalMarks} / {row.totalMaxMarks}</td>
                  <td className="px-3 py-3 text-center font-bold text-blue-600">{row.percentage.toFixed(1)}%</td>
                  <td className="px-3 py-3 text-center font-bold text-purple-600">{row.gpa.toFixed(2)}</td>
                  <td className="px-3 py-3 text-center">{getResultBadge(row.resultStatus)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
