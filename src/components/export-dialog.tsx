"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { FileText, FileSpreadsheet, FileCode, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { ExportFormat, ExportType } from "@/lib/export/types";

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: ExportType;
  defaultParams?: Record<string, string>;
  title?: string;
}

export function ExportDialog({ open, onOpenChange, type, defaultParams = {}, title }: ExportDialogProps) {
  const [format, setFormat] = useState<ExportFormat>("csv");
  const [dateFrom, setDateFrom] = useState(defaultParams.dateFrom || "");
  const [dateTo, setDateTo] = useState(defaultParams.dateTo || "");
  const [loading, setLoading] = useState(false);

  const displayTitle = title || `Export ${type.charAt(0).toUpperCase() + type.slice(1)} Data`;

  async function handleExport() {
    setLoading(true);
    try {
      const qp = new URLSearchParams({
        type,
        format,
        ...defaultParams,
      });

      if (dateFrom) qp.set("dateFrom", dateFrom);
      if (dateTo) qp.set("dateTo", dateTo);

      const res = await fetch(`/api/export?${qp.toString()}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Export request failed" }));
        throw new Error(err.error || `Export failed with status ${res.status}`);
      }

      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") || "";
      const match = disposition.match(/filename="?(.+?)"?$/);
      const filename = match?.[1] || `thaibahive_${type}_export.${format}`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(`Export downloaded: ${filename}`);
      onOpenChange(false);
    } catch (e: any) {
      console.error("Export error:", e);
      toast.error(e.message || "Failed to download export file");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-slate-900">
            <Download className="w-5 h-5 text-indigo-600" />
            {displayTitle}
          </DialogTitle>
          <DialogDescription>
            Select file format and date range to export records.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-3">
          {/* Format Selector */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase text-slate-500">File Format</Label>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setFormat("csv")}
                className={`flex flex-col items-center justify-between rounded-md border-2 p-3 transition-colors ${
                  format === "csv"
                    ? "border-indigo-600 bg-indigo-50/50 text-indigo-950 font-semibold"
                    : "border-muted bg-popover hover:bg-accent text-slate-700"
                }`}
              >
                <FileCode className="mb-2 h-6 w-6 text-emerald-600" />
                <span className="text-xs">CSV</span>
              </button>

              <button
                type="button"
                onClick={() => setFormat("xlsx")}
                className={`flex flex-col items-center justify-between rounded-md border-2 p-3 transition-colors ${
                  format === "xlsx"
                    ? "border-indigo-600 bg-indigo-50/50 text-indigo-950 font-semibold"
                    : "border-muted bg-popover hover:bg-accent text-slate-700"
                }`}
              >
                <FileSpreadsheet className="mb-2 h-6 w-6 text-green-600" />
                <span className="text-xs">Excel (.xlsx)</span>
              </button>

              <button
                type="button"
                onClick={() => setFormat("pdf")}
                className={`flex flex-col items-center justify-between rounded-md border-2 p-3 transition-colors ${
                  format === "pdf"
                    ? "border-indigo-600 bg-indigo-50/50 text-indigo-950 font-semibold"
                    : "border-muted bg-popover hover:bg-accent text-slate-700"
                }`}
              >
                <FileText className="mb-2 h-6 w-6 text-rose-600" />
                <span className="text-xs">PDF (.pdf)</span>
              </button>
            </div>
          </div>

          {/* Date Filter Range */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="date-from" className="text-xs text-slate-600">Start Date</Label>
              <Input
                id="date-from"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="date-to" className="text-xs text-slate-600">End Date</Label>
              <Input
                id="date-to"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleExport} disabled={loading} className="bg-indigo-600 hover:bg-indigo-700 text-white">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Export {format.toUpperCase()}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
