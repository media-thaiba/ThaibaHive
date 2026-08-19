"use client";

import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GradeScaleSelect } from "./GradeScaleSelect";
import { SubjectScheduleForm, ScheduleItemForm } from "./SubjectScheduleForm";

interface ExamSetupWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function ExamSetupWizard({ open, onOpenChange, onSuccess }: ExamSetupWizardProps) {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [title, setTitle] = useState("");
  const [academicYear, setAcademicYear] = useState("2025-2026");
  const [term, setTerm] = useState("Term 1");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [gradeScaleId, setGradeScaleId] = useState("gs_10point_standard");
  const [schedules, setSchedules] = useState<ScheduleItemForm[]>([]);

  const handleNext = () => {
    if (step === 1) {
      if (!title.trim() || !startDate || !endDate) {
        alert("Please fill in examination title, start date, and end date.");
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (schedules.length === 0) {
        alert("Please add at least one subject schedule slot.");
        return;
      }
      setStep(3);
    }
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      // 1. Create Exam Session
      const resExam = await fetch("/api/examinations/exams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          academicYear,
          term,
          startDate,
          endDate,
          gradeScaleId,
        }),
      });

      const examData = await resExam.json();
      if (!resExam.ok) throw new Error(examData.error || "Failed to create exam session");

      const examId = examData.exam.id;

      // 2. Add Schedules
      for (const s of schedules) {
        await fetch("/api/examinations/schedules", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            examId,
            subjectName: s.subjectName,
            examDate: s.examDate,
            startTime: s.startTime,
            endTime: s.endTime,
            maxMarks: s.maxMarks,
            passMarks: s.passMarks,
            roomNumber: s.roomNumber,
          }),
        });
      }

      alert("Examination session created successfully!");
      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      alert(err.message || "An error occurred during exam setup.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Examination Setup Wizard (Step {step} of 3)</DialogTitle>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs font-medium text-foreground">Examination Title</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Final Term Examinations 2026"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-foreground">Academic Year</label>
                <Input value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-medium text-foreground">Academic Term</label>
                <Input value={term} onChange={(e) => setTerm(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-foreground">Start Date</label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-medium text-foreground">End Date</label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="py-2">
            <SubjectScheduleForm
              schedules={schedules}
              onAddSchedule={(s) => setSchedules([...schedules, s])}
              onRemoveSchedule={(idx) => setSchedules(schedules.filter((_, i) => i !== idx))}
            />
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4 py-2">
            <GradeScaleSelect value={gradeScaleId} onChange={setGradeScaleId} />
            <div className="p-3 border rounded-lg bg-muted/20 space-y-2 text-xs text-muted-foreground">
              <div className="font-semibold text-foreground">Setup Summary</div>
              <div>Title: {title}</div>
              <div>Period: {startDate} to {endDate} ({term}, {academicYear})</div>
              <div>Scheduled Subjects: {schedules.length} slot(s)</div>
            </div>
          </div>
        )}

        <DialogFooter className="flex justify-between items-center">
          {step > 1 ? (
            <Button variant="outline" onClick={handleBack} disabled={isSubmitting}>
              Back
            </Button>
          ) : (
            <div />
          )}

          {step < 3 ? (
            <Button onClick={handleNext}>Next</Button>
          ) : (
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Finalize & Create Exam Session"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
