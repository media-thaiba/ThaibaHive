"use client";

import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface HallTicketVerificationViewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function HallTicketVerificationView({ open, onOpenChange }: HallTicketVerificationViewProps) {
  const [qrPayload, setQrPayload] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleVerify = async () => {
    if (!qrPayload.trim()) return;

    setIsVerifying(true);
    setResult(null);

    try {
      const res = await fetch("/api/examinations/hall-tickets/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qrPayload }),
      });

      const data = await res.json();
      setResult(data);
    } catch (err: any) {
      setResult({ valid: false, error: err.message || "Network error" });
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Invigilator Entrance Scanner & QR Verification</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <label className="text-xs font-medium text-foreground">Scan or Paste Hall Ticket QR Payload</label>
            <Input
              value={qrPayload}
              onChange={(e) => setQrPayload(e.target.value)}
              placeholder="Paste base64 QR payload..."
              className="font-mono text-xs"
            />
          </div>

          <Button onClick={handleVerify} disabled={isVerifying} className="w-full">
            {isVerifying ? "Verifying..." : "Verify Candidate Clearance"}
          </Button>

          {result && (
            <div className={`p-4 border rounded-lg ${result.valid ? "bg-emerald-50 border-emerald-300 dark:bg-emerald-950/20" : "bg-destructive/10 border-destructive/30"}`}>
              <div className="flex items-center justify-between">
                <div className="font-bold text-sm">
                  {result.valid ? "ENTRY GRANTED (Valid Ticket)" : "ENTRY DENIED"}
                </div>
                <Badge variant={result.valid ? "success" : "destructive"}>
                  {result.valid ? "CLEARED" : "BLOCKED"}
                </Badge>
              </div>

              {result.valid ? (
                <div className="mt-2 text-xs space-y-1 text-emerald-900 dark:text-emerald-200">
                  <div>Ticket Number: <span className="font-mono font-semibold">{result.ticketNumber}</span></div>
                  <div>Student ID: <span className="font-mono">{result.studentId}</span></div>
                  <div>Exam Session: <span className="font-mono">{result.examId}</span></div>
                </div>
              ) : (
                <div className="mt-2 text-xs text-destructive font-medium">
                  Reason: {result.error}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
