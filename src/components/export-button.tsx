"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

type ExportType = "attendance" | "leaves" | "staff" | "payroll";

type ExportButtonProps = {
  type: ExportType;
  params?: Record<string, string>;
  label?: string;
};

export function ExportButton({ type, params, label }: ExportButtonProps) {
  const [loading, setLoading] = useState(false);

  async function handleExport() {
    setLoading(true);
    try {
      const qp = new URLSearchParams({ type, ...params });
      const res = await fetch(`/api/export?${qp}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Export failed" }));
        throw new Error(err.error || "Export failed");
      }
      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") || "";
      const match = disposition.match(/filename="?(.+?)"?$/);
      const filename = match?.[1] || `thaibahive_${type}_export.csv`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Export error:", e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button onClick={handleExport} disabled={loading} variant="outline" size="sm">
      {loading ? "Exporting..." : label || "Export CSV"}
    </Button>
  );
}
