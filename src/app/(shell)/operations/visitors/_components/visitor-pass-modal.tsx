"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { X, Printer, QrCode, AlertCircle } from "lucide-react";
import QRCode from "qrcode";
import { QRCodeSVG } from "./qr-code";
import { escapeHtml } from "@/lib/utils";
import type { Visitor } from "./types";

function formatDateTime(date: string | null | undefined): string {
  if (!date) return "—";
  const d = new Date(date);
  return d.toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

const PASS_VALIDITY_HOURS = 8;

export function VisitorPassModal({
  visitor,
  onClose,
}: {
  visitor: Visitor | null;
  onClose: () => void;
}) {
  const [qrPayload, setQrPayload] = useState<string | null>(null);
  const [issuing, setIssuing] = useState(false);
  const [issueError, setIssueError] = useState<string | null>(null);
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    // Only checked-in visitors get a fresh signed pass; checked-out visitors
    // keep their historical details but no longer hold a valid QR pass.
    if (!visitor || visitor.status !== "checked_in") {
      setQrPayload(null);
      setIssuing(false);
      setIssueError(null);
      return;
    }

    let cancelled = false;
    (async () => {
      setIssuing(true);
      setIssueError(null);
      setQrPayload(null);
      try {
        const validFrom =
          visitor.checkIn && !Number.isNaN(Date.parse(visitor.checkIn))
            ? visitor.checkIn
            : new Date().toISOString();
        const validUntil = new Date(
          Date.now() + PASS_VALIDITY_HOURS * 60 * 60 * 1000
        ).toISOString();

        const res = await fetch("/api/visitors/pass/issue", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            visitorName: visitor.name,
            visitorPhone: visitor.contact || "",
            hostStaffId: visitor.hostStaffId,
            purpose: visitor.purpose,
            validFrom,
            validUntil,
          }),
        });

        if (cancelled) return;

        if (res.ok) {
          const data = await res.json();
          setQrPayload(data.qrPayload);
        } else {
          const data = await res.json().catch(() => ({}));
          setIssueError(data.error || "Failed to issue visitor pass");
        }
      } catch {
        if (!cancelled) setIssueError("Failed to issue visitor pass");
      } finally {
        if (!cancelled) setIssuing(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [visitor]);

  if (!visitor) return null;

  const hostName = visitor.hostStaffName
    ? `${visitor.hostStaffName} ${visitor.hostStaffLastName || ""}`.trim()
    : "Not assigned";
  const passId = `VIS-${visitor.id.slice(0, 8).toUpperCase()}`;

  const handlePrint = async () => {
    if (!qrPayload || printing) return;
    setPrinting(true);
    try {
      const qrSvg = await QRCode.toString(qrPayload, {
        type: "svg",
        margin: 1,
        width: 160,
      });

      const printWindow = window.open("", "_blank");
      if (!printWindow) return;

      const styleContent = `
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; }
      .pass { border: 2px solid #1f2937; border-radius: 12px; padding: 24px; max-width: 360px; margin: 0 auto; }
      .header { text-align: center; border-bottom: 2px solid #1f2937; padding-bottom: 16px; margin-bottom: 16px; }
      .logo { font-size: 24px; font-weight: 800; color: #1f2937; margin-bottom: 4px; }
      .badge-type { font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; }
      .field { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
      .field:last-child { border-bottom: none; }
      .label { font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; }
      .value { font-size: 14px; font-weight: 600; color: #1f2937; text-align: right; max-width: 65%; word-break: break-word; }
      .qr-section { text-align: center; padding: 16px 0; }
      .qr-label { font-size: 10px; color: #9ca3af; margin-top: 8px; }
      .footer { text-align: center; margin-top: 16px; font-size: 10px; color: #9ca3af; }
      @media print { body { padding: 0; } .no-print { display: none; } }
    `;

      const htmlContent = `
      <div class="pass">
        <div class="header">
          <div class="logo">ThaibaHive</div>
          <div class="badge-type">Visitor Pass</div>
        </div>
        <div class="field"><span class="label">Pass ID</span><span class="value">${escapeHtml(passId)}</span></div>
        <div class="field"><span class="label">Visitor Name</span><span class="value">${escapeHtml(visitor.name)}</span></div>
        <div class="field"><span class="label">Contact</span><span class="value">${escapeHtml(visitor.contact || "—")}</span></div>
        ${visitor.idType ? `<div class="field"><span class="label">ID Type</span><span class="value">${escapeHtml(visitor.idType)}</span></div>` : ""}
        ${visitor.idNumber ? `<div class="field"><span class="label">ID Number</span><span class="value">${escapeHtml(visitor.idNumber)}</span></div>` : ""}
        <div class="field"><span class="label">Host</span><span class="value">${escapeHtml(hostName)}</span></div>
        <div class="field"><span class="label">Purpose</span><span class="value">${escapeHtml(visitor.purpose)}</span></div>
        <div class="field"><span class="label">Check-in</span><span class="value">${escapeHtml(formatDateTime(visitor.checkIn))}</span></div>
        <div class="qr-section">
          ${qrSvg}
          <div class="qr-label">Scan to verify visitor identity</div>
        </div>
        <div class="footer">
          ThaibaHive Visitor Management System · Generated on ${escapeHtml(new Date().toLocaleString("en-IN"))}
        </div>
      </div>
    `;

      const printContent = `<!DOCTYPE html>
<html>
<head>
<title>Visitor Pass - ${escapeHtml(visitor.name)}</title>
<style>${styleContent}</style>
</head>
<body>
${htmlContent}
</body>
</html>`;

      printWindow.document.write(printContent);
      printWindow.document.close();
    } finally {
      setPrinting(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Visitor Pass</span>
            <Badge variant="outline" className="text-xs">{passId}</Badge>
          </DialogTitle>
          <DialogDescription>
            Print or save this pass for visitor verification
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 p-2">
          <div className="border rounded-lg p-4 bg-card">
            <div className="flex items-center justify-between mb-4 pb-3 border-b">
              <div>
                <p className="font-semibold text-lg">{visitor.name}</p>
                <p className="text-xs text-muted-foreground">{passId}</p>
              </div>
              {qrPayload ? (
                <QRCodeSVG data={qrPayload} size={96} />
              ) : issuing ? (
                <Skeleton className="h-24 w-24" />
              ) : visitor.status === "checked_out" ? (
                <div className="h-24 w-24 flex flex-col items-center justify-center text-muted-foreground border rounded-lg">
                  <QrCode className="h-6 w-6 mb-1" />
                  <span className="text-[9px] text-center leading-tight">Pass expired<br />(checked out)</span>
                </div>
              ) : (
                <div className="h-24 w-24 flex items-center justify-center">
                  <AlertCircle className="h-6 w-6 text-muted-foreground/50" />
                </div>
              )}
            </div>

            {issueError && (
              <Alert variant="error" className="mb-3 text-xs">
                {issueError}
              </Alert>
            )}

            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Host</span>
                <span className="font-medium">{hostName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Check-in</span>
                <span className="font-medium">{formatDateTime(visitor.checkIn)}</span>
              </div>
              {visitor.checkOut && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Check-out</span>
                  <span className="font-medium">{formatDateTime(visitor.checkOut)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Purpose</span>
                <span className="font-medium text-right max-w-[60%]">{visitor.purpose}</span>
              </div>
              {visitor.contact && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Contact</span>
                  <span className="font-medium">{visitor.contact}</span>
                </div>
              )}
              {visitor.idType && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">ID Type</span>
                  <span className="font-medium">{visitor.idType}</span>
                </div>
              )}
              {visitor.idNumber && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">ID Number</span>
                  <span className="font-medium font-mono text-xs">{visitor.idNumber}</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handlePrint}
              className="flex-1"
              variant="default"
              disabled={!qrPayload || issuing || printing}
            >
              <Printer className="h-4 w-4 mr-2" />
              {printing ? "Preparing..." : "Print Pass"}
            </Button>
            <Button onClick={onClose} variant="outline" className="flex-1">
              <X className="h-4 w-4 mr-2" />
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
