"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ExportDialog } from "@/components/export-dialog";
import { Download } from "lucide-react";
import { ExportType } from "@/lib/export/types";

type ExportButtonProps = {
  type: ExportType;
  params?: Record<string, string>;
  label?: string;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
};

export function ExportButton({ type, params, label, variant = "outline", size = "sm" }: ExportButtonProps) {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setDialogOpen(true)} variant={variant} size={size}>
        <Download className="mr-2 h-4 w-4 text-slate-500" />
        {label || "Export"}
      </Button>

      <ExportDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        type={type}
        defaultParams={params}
      />
    </>
  );
}
