"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import { ExamExportDialog } from "@/components/examinations/ExamExportDialog";

const TabulationRegister = dynamic(
  () => import("@/components/examinations/TabulationRegister").then((m) => m.TabulationRegister),
  {
    ssr: false,
    loading: () => <Skeleton className="h-[400px] w-full" />,
  }
);

export default function TabulationPage() {
  const [showExport, setShowExport] = useState(false);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <TabulationRegister
        examId="exam_100"
        onExportClick={() => setShowExport(true)}
      />

      <ExamExportDialog
        open={showExport}
        onOpenChange={setShowExport}
        examId="exam_100"
      />
    </div>
  );
}
