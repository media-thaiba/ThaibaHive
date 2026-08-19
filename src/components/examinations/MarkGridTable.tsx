"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { calculateGrade } from "@/lib/examinations/grade-calculator";

export interface StudentMarkRow {
  studentId: string;
  studentName: string;
  rollNumber: string;
  evaluatorToken?: string;
  marksObtained: number | null;
  maxMarks: number;
  isAbsent: boolean;
  remarks?: string;
}

interface MarkGridTableProps {
  rows: StudentMarkRow[];
  doubleBlind: boolean;
  maxMarks: number;
  onMarkChange: (studentId: string, value: number | null, isAbsent: boolean) => void;
}

export function MarkGridTable({
  rows,
  doubleBlind,
  maxMarks,
  onMarkChange,
}: MarkGridTableProps) {
  return (
    <div className="border rounded-lg overflow-hidden bg-card">
      <table className="w-full text-sm text-left border-collapse">
        <thead className="bg-muted/50 text-xs font-semibold uppercase text-muted-foreground">
          <tr>
            <th className="px-4 py-3">#</th>
            <th className="px-4 py-3">{doubleBlind ? "Evaluator Token Code" : "Candidate Roll No & Name"}</th>
            <th className="px-4 py-3 text-center">Absent?</th>
            <th className="px-4 py-3 w-40">Marks Obtained (Max: {maxMarks})</th>
            <th className="px-4 py-3 text-center">Grade Preview</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((row, idx) => {
            const isInvalid = !row.isAbsent && row.marksObtained !== null && (row.marksObtained < 0 || row.marksObtained > maxMarks);
            const percentage = row.marksObtained !== null && maxMarks > 0 ? (row.marksObtained / maxMarks) * 100 : 0;
            const gradeInfo = row.isAbsent ? { letterGrade: "F", gpa: 0 } : calculateGrade(percentage);

            return (
              <tr key={row.studentId} className={`hover:bg-muted/30 ${isInvalid ? "bg-destructive/10" : ""}`}>
                <td className="px-4 py-3 text-xs text-muted-foreground">{idx + 1}</td>
                <td className="px-4 py-3 font-medium">
                  {doubleBlind ? (
                    <span className="font-mono text-xs text-purple-600 font-bold">
                      {row.evaluatorToken || `EVAL-${row.studentId.substring(0, 6).toUpperCase()}`}
                    </span>
                  ) : (
                    <div>
                      <div className="text-foreground">{row.studentName}</div>
                      <div className="text-xs text-muted-foreground font-mono">{row.rollNumber}</div>
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  <input
                    type="checkbox"
                    checked={row.isAbsent}
                    onChange={(e) => onMarkChange(row.studentId, e.target.checked ? null : 0, e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                </td>
                <td className="px-4 py-3">
                  <Input
                    type="number"
                    disabled={row.isAbsent}
                    value={row.isAbsent ? "" : row.marksObtained ?? ""}
                    onChange={(e) => {
                      const val = e.target.value === "" ? null : parseFloat(e.target.value);
                      onMarkChange(row.studentId, val, false);
                    }}
                    placeholder={row.isAbsent ? "ABSENT" : "0"}
                    className={`h-8 text-sm ${isInvalid ? "border-destructive focus-visible:ring-destructive" : ""}`}
                  />
                  {isInvalid && (
                    <span className="text-[10px] text-destructive font-semibold">Exceeds max ({maxMarks})</span>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  {row.isAbsent ? (
                    <Badge variant="destructive">ABSENT</Badge>
                  ) : row.marksObtained !== null && !isInvalid ? (
                    <Badge variant={gradeInfo.letterGrade === "F" ? "destructive" : "success"}>
                      {gradeInfo.letterGrade} ({gradeInfo.gpa.toFixed(1)})
                    </Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">-</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
