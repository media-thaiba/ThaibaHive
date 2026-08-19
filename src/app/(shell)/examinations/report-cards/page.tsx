"use client";

import React, { useState } from "react";
import { ReportCardViewer } from "@/components/examinations/ReportCardViewer";
import { Button } from "@/components/ui/button";

export default function ReportCardsPage() {
  const [showViewer, setShowViewer] = useState(false);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold">Student Report Cards Portal</h1>
          <p className="text-sm text-muted-foreground">
            Generate and preview encrypted PDF report cards for parent portal delivery.
          </p>
        </div>
        <Button onClick={() => setShowViewer(true)}>
          Preview Sample Report Card
        </Button>
      </div>

      {showViewer && (
        <ReportCardViewer
          open={showViewer}
          onOpenChange={setShowViewer}
          examId="exam_100"
          studentId="stud_101"
          studentName="Alex Rivera"
        />
      )}
    </div>
  );
}
