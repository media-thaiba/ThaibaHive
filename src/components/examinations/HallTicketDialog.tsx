"use client";

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { FeeLockNotice } from "./FeeLockNotice";

interface HallTicketDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  examId: string;
  studentId: string;
  studentName?: string;
  rollNumber?: string;
}

export function HallTicketDialog({
  open,
  onOpenChange,
  examId,
  studentId,
  studentName = "Alex Rivera",
  rollNumber = "STU-2026-8801",
}: HallTicketDialogProps) {
  const [ticket, setTicket] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [feeBlocked, setFeeBlocked] = useState(false);
  const [pendingAmount, setPendingAmount] = useState(0);

  const issueTicket = React.useCallback(async (override: boolean = false, reason: string = "") => {
    setIsLoading(true);
    setFeeBlocked(false);

    try {
      const res = await fetch("/api/examinations/hall-tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          examId,
          studentId,
          overrideFeeLock: override,
          overrideReason: reason,
        }),
      });

      const data = await res.json();
      if (res.status === 403 && data.feeCleared === false) {
        setFeeBlocked(true);
        setPendingAmount(data.pendingAmount || 0);
      } else if (res.ok && data.hallTicket) {
        setTicket(data.hallTicket);
      } else {
        alert(data.error || "Failed to generate hall ticket");
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [examId, studentId]);

  useEffect(() => {
    if (open && examId && studentId) {
      issueTicket();
    }
  }, [open, examId, studentId, issueTicket]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Official Examination Hall Ticket</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-3 py-4">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : feeBlocked ? (
          <FeeLockNotice
            pendingAmount={pendingAmount}
            onOverrideRequest={(reason) => issueTicket(true, reason)}
          />
        ) : ticket ? (
          <div className="space-y-4 py-2 border p-4 rounded-lg bg-card">
            {/* Ticket Header */}
            <div className="flex justify-between items-start border-b pb-3">
              <div>
                <div className="text-lg font-bold text-foreground">{studentName}</div>
                <div className="text-xs font-mono text-muted-foreground">Roll No: {rollNumber}</div>
                <div className="text-xs text-muted-foreground mt-0.5">Ticket ID: {ticket.ticketNumber}</div>
              </div>
              <div className="text-right">
                <Badge variant={ticket.overrideFeeLock ? "warning" : "success"}>
                  {ticket.overrideFeeLock ? "Override Approved" : "Fee Cleared"}
                </Badge>
                <div className="text-[10px] text-muted-foreground mt-1 font-mono">
                  Issued: {new Date(ticket.issuedAt).toLocaleDateString()}
                </div>
              </div>
            </div>

            {/* QR Code Placeholder Box */}
            <div className="flex items-center justify-between p-3 border rounded bg-muted/20">
              <div className="text-xs space-y-1">
                <div className="font-semibold text-foreground">Invigilator QR Signature</div>
                <div className="text-[10px] text-muted-foreground font-mono truncate max-w-[200px]">
                  {ticket.qrPayload.substring(0, 32)}...
                </div>
                <div className="text-[10px] text-emerald-600 font-semibold">Cryptographically Signed</div>
              </div>
              <div className="w-16 h-16 bg-foreground text-background font-mono text-[9px] flex items-center justify-center p-1 rounded text-center">
                [QR CODE]
              </div>
            </div>
          </div>
        ) : (
          <div className="py-6 text-center text-muted-foreground text-sm">
            No hall ticket generated.
          </div>
        )}

        <DialogFooter className="flex justify-between">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {ticket && (
            <Button onClick={() => window.print()}>
              Print Hall Ticket
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
