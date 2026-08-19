"use client";

import React from "react";
import { ExportDialog } from "@/components/export-dialog";

interface ExamExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  examId?: string;
}

export function ExamExportDialog({ open, onOpenChange, examId }: ExamExportDialogProps) {
  return (
    <ExportDialog
      open={open}
      onOpenChange={onOpenChange}
      type="tabulation"
      title="Examination Tabulation Register Export"
      defaultParams={{ examId: examId || "exam_100" }}
    />
  );
}
