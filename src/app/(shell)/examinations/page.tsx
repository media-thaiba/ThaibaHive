"use client";

import React, { useState } from "react";
import { ExamDashboard } from "@/components/examinations/ExamDashboard";
import { ExamSessionItem } from "@/components/examinations/ExamQueue";
import { ExamSetupWizard } from "@/components/examinations/ExamSetupWizard";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MarkEntryPortal } from "@/components/examinations/MarkEntryPortal";

export default function ExaminationsPage() {
  const [selectedExam, setSelectedExam] = useState<ExamSessionItem | null>(null);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isMarkEntryOpen, setIsMarkEntryOpen] = useState(false);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <ExamDashboard
        onOpenSetupWizard={() => {
          setIsWizardOpen(true);
        }}
        onSelectAction={(exam, action) => {
          setSelectedExam(exam);
          if (action === "tabulation") {
            window.location.href = `/examinations/tabulation?examId=${exam.id}`;
          } else if (action === "mark_entry") {
            setIsMarkEntryOpen(true);
          } else {
            alert(`Selected ${action} for ${exam.title}`);
          }
        }}
      />

      <ExamSetupWizard
        open={isWizardOpen}
        onOpenChange={setIsWizardOpen}
        onSuccess={() => {
          // Re-render dashboard
          window.location.reload();
        }}
      />

      {selectedExam && (
        <Dialog open={isMarkEntryOpen} onOpenChange={setIsMarkEntryOpen}>
          <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Mark Entry: {selectedExam.title}</DialogTitle>
            </DialogHeader>
            <MarkEntryPortal
              examScheduleId="sched_100_math"
              subjectName="Advanced Mathematics"
              maxMarks={100}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
