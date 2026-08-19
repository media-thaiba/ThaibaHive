"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MarkGridTable, StudentMarkRow } from "./MarkGridTable";
import { MarkModerationModal } from "./MarkModerationModal";

interface MarkEntryPortalProps {
  examScheduleId?: string;
  subjectName?: string;
  maxMarks?: number;
}

export function MarkEntryPortal({
  examScheduleId = "sched_math_1",
  subjectName = "Advanced Mathematics",
  maxMarks = 100,
}: MarkEntryPortalProps) {
  const [doubleBlind, setDoubleBlind] = useState(false);
  const [rows, setRows] = useState<StudentMarkRow[]>([
    { studentId: "stud_101", studentName: "Alex Rivera", rollNumber: "STU-2026-8801", marksObtained: 85, maxMarks, isAbsent: false },
    { studentId: "stud_102", studentName: "Samantha Chen", rollNumber: "STU-2026-8802", marksObtained: 92, maxMarks, isAbsent: false },
    { studentId: "stud_103", studentName: "Marcus Vance", rollNumber: "STU-2026-8803", marksObtained: null, maxMarks, isAbsent: true },
    { studentId: "stud_104", studentName: "Priya Sharma", rollNumber: "STU-2026-8804", marksObtained: 78, maxMarks, isAbsent: false },
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedMarkForMod, setSelectedMarkForMod] = useState<string | null>(null);

  const handleMarkChange = (studentId: string, value: number | null, isAbsent: boolean) => {
    setRows((prev) =>
      prev.map((r) => (r.studentId === studentId ? { ...r, marksObtained: value, isAbsent } : r))
    );
  };

  const handleBatchSubmit = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/examinations/marks/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          examScheduleId,
          doubleBlind,
          entries: rows.map((r) => ({
            studentId: r.studentId,
            marksObtained: r.marksObtained,
            isAbsent: r.isAbsent,
            remarks: r.remarks,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Batch submission failed");

      alert(`Successfully saved mark entries for ${data.processedCount} student(s).`);
    } catch (err: any) {
      alert(err.message || "Failed to submit marks.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Workspace Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border rounded-lg bg-card">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold">{subjectName}</h2>
            <Badge variant="secondary">Max Marks: {maxMarks}</Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Subject Evaluation & Mark Entry Workspace (Schedule ID: {examScheduleId})
          </p>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
            <input
              type="checkbox"
              checked={doubleBlind}
              onChange={(e) => setDoubleBlind(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            Double-Blind Mode (Mask Candidates)
          </label>
          <Button onClick={handleBatchSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Save & Submit Marks"}
          </Button>
        </div>
      </div>

      {/* Grid Table */}
      <MarkGridTable
        rows={rows}
        doubleBlind={doubleBlind}
        maxMarks={maxMarks}
        onMarkChange={handleMarkChange}
      />

      {/* Moderation Modal Trigger if selected */}
      {selectedMarkForMod && (
        <MarkModerationModal
          open={true}
          onOpenChange={(open) => !open && setSelectedMarkForMod(null)}
          markEntryId={selectedMarkForMod}
          currentMarks={85}
          maxMarks={maxMarks}
          onSuccess={() => setSelectedMarkForMod(null)}
        />
      )}
    </div>
  );
}
