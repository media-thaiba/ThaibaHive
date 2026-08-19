"use client";

import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ReportCardViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  examId: string;
  studentId: string;
  studentName?: string;
}

export function ReportCardViewer({
  open,
  onOpenChange,
  examId,
  studentId,
  studentName = "Alex Rivera",
}: ReportCardViewerProps) {
  const [encrypt, setEncrypt] = useState(false);

  const pdfUrl = `/api/examinations/report-cards?examId=${examId}&studentId=${studentId}${encrypt ? "&encrypt=true" : ""}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[85vh] flex flex-col">
        <DialogHeader className="flex flex-row items-center justify-between border-b pb-2">
          <DialogTitle>Official Report Card - {studentName}</DialogTitle>
          <div className="flex items-center gap-3 mr-6">
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={encrypt}
                onChange={(e) => setEncrypt(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              Encrypt PDF (DOB Protected)
            </label>
          </div>
        </DialogHeader>

        <div className="flex-1 bg-muted/20 rounded-lg border overflow-hidden my-2">
          <iframe
            src={pdfUrl}
            className="w-full h-full border-none"
            title={`Report Card - ${studentName}`}
          />
        </div>

        <DialogFooter className="flex justify-between">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={() => window.open(pdfUrl, "_blank")}>
            Open PDF in New Window
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
