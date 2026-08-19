"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { FileText, Download, CheckCircle, ShieldCheck } from "lucide-react";

interface RegulatoryExportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerateExport?: (standard: "SOC2" | "ISO27001" | "GDPR" | "HIPAA") => Promise<any>;
}

export function RegulatoryExportModal({
  open,
  onOpenChange,
  onGenerateExport,
}: RegulatoryExportModalProps) {
  const [standard, setStandard] = useState<"SOC2" | "ISO27001" | "GDPR" | "HIPAA">("SOC2");
  const [loading, setLoading] = useState(false);
  const [exportResult, setExportResult] = useState<any | null>(null);

  const handleGenerate = async () => {
    if (!onGenerateExport) return;
    try {
      setLoading(true);
      const result = await onGenerateExport(standard);
      setExportResult(result);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadJson = () => {
    if (!exportResult) return;
    const blob = new Blob([JSON.stringify(exportResult, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `compliance-${standard.toLowerCase()}-${exportResult.exportId || "dossier"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <FileText className="h-5 w-5 text-indigo-500" />
            Generate Regulatory Compliance Dossier
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2 text-sm">
          {!exportResult ? (
            <>
              <div className="space-y-2">
                <label className="text-xs font-medium">Compliance Framework</label>
                <Select
                  value={standard}
                  onChange={(e) => setStandard(e.target.value as "SOC2" | "ISO27001" | "GDPR" | "HIPAA")}
                >
                  <option value="SOC2">SOC 2 Type II (Security & Access)</option>
                  <option value="ISO27001">ISO/IEC 27001:2022 (ISMS Controls)</option>
                  <option value="GDPR">GDPR (Art. 30, 32, 33 Data Protection)</option>
                  <option value="HIPAA">HIPAA (164.312 Technical Safeguards)</option>
                </Select>
              </div>

              <div className="p-3 bg-muted/40 rounded border border-border text-xs text-muted-foreground space-y-1">
                <div>• Bundles cryptographic SHA-256 Merkle root logs</div>
                <div>• Attaches signed forensic state snapshot manifest</div>
                <div>• Generates RSA-SHA256 digital signature watermark</div>
              </div>
            </>
          ) : (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded text-xs space-y-2">
              <div className="flex items-center gap-2 text-emerald-600 font-semibold text-sm">
                <CheckCircle className="h-5 w-5" />
                Compliance Dossier Ready
              </div>
              <div>
                <strong>Dossier ID:</strong> {exportResult.exportId}
              </div>
              <div>
                <strong>Checksum SHA-256:</strong>{" "}
                <span className="font-mono">{exportResult.checksumSha256?.substring(0, 16)}...</span>
              </div>
              <div>
                <strong>Signature:</strong>{" "}
                <span className="text-emerald-600 font-medium">Cryptographically Signed</span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {!exportResult ? (
            <Button onClick={handleGenerate} disabled={loading}>
              <ShieldCheck className="h-4 w-4 mr-1" />
              {loading ? "Generating Signed Pack..." : "Generate Signed Dossier"}
            </Button>
          ) : (
            <Button onClick={handleDownloadJson}>
              <Download className="h-4 w-4 mr-1" />
              Download JSON Evidence Pack
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
