"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X, Printer } from "lucide-react";
import { QRCodeSVG } from "./qr-code";
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

export function VisitorPassModal({
  visitor,
  onClose,
}: {
  visitor: Visitor | null;
  onClose: () => void;
}) {
  if (!visitor) return null;

  const passId = `VIS-${visitor.id.slice(0, 8).toUpperCase()}`;
  const hostName = visitor.hostStaffName
    ? `${visitor.hostStaffName} ${visitor.hostStaffLastName || ""}`.trim()
    : "Not assigned";
  const qrData = `VISITOR:${visitor.id}|NAME:${visitor.name}|PASS:${passId}|HOST:${hostName}|CHECKIN:${visitor.checkIn}`;

  const handlePrint = () => {
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
        <div class="field"><span class="label">Pass ID</span><span class="value">${passId}</span></div>
        <div class="field"><span class="label">Visitor Name</span><span class="value">${visitor.name}</span></div>
        <div class="field"><span class="label">Contact</span><span class="value">${visitor.contact || "—"}</span></div>
        ${visitor.idType ? `<div class="field"><span class="label">ID Type</span><span class="value">${visitor.idType}</span></div>` : ""}
        ${visitor.idNumber ? `<div class="field"><span class="label">ID Number</span><span class="value">${visitor.idNumber}</span></div>` : ""}
        <div class="field"><span class="label">Host</span><span class="value">${hostName}</span></div>
        <div class="field"><span class="label">Purpose</span><span class="value">${visitor.purpose}</span></div>
        <div class="field"><span class="label">Check-in</span><span class="value">${formatDateTime(visitor.checkIn)}</span></div>
        <div class="qr-section">
          <div id="qr-code"></div>
          <div class="qr-label">Scan to verify visitor identity</div>
        </div>
        <div class="footer">
          ThaibaHive Visitor Management System · Generated on ${new Date().toLocaleString("en-IN")}
        </div>
      </div>
    `;

    const scriptContent = `
      (function() {
        const data = "${qrData.replace(/"/g, '\\"')}";
        const size = 160;
        const modules = 25;
        const moduleSize = size / modules;
        let hash = 0;
        for (let i = 0; i < data.length; i++) {
          hash = ((hash << 5) - hash) + data.charCodeAt(i);
          hash |= 0;
        }
        hash = Math.abs(hash);
        let svg = '<svg width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '" xmlns="http://www.w3.org/2000/svg"><rect width="' + size + '" height="' + size + '" fill="#fff"/><g>';
        for (let y = 0; y < modules; y++) {
          for (let x = 0; x < modules; x++) {
            const bit = (hash >> ((x * 7 + y * 13) % 32)) & 1;
            const isFinder = (x < 7 && y < 7) || (x >= modules - 7 && y < 7) || (x < 7 && y >= modules - 7);
            if (isFinder) {
              const inBorder = x < 1 || y < 1 || x >= 6 || y >= 6;
              const inInner = x > 1 && y > 1 && x < 5 && y < 5;
              if (inBorder || inInner) {
                svg += '<rect x="' + (x * moduleSize) + '" y="' + (y * moduleSize) + '" width="' + moduleSize + '" height="' + moduleSize + '" fill="#000"/>';
              }
            } else if (bit) {
              svg += '<rect x="' + (x * moduleSize) + '" y="' + (y * moduleSize) + '" width="' + moduleSize + '" height="' + moduleSize + '" fill="#000"/>';
            }
          }
        }
        svg += '</g></svg>';
        document.getElementById('qr-code').innerHTML = svg;
        window.print();
      })();
    `;

    const printContent = `<!DOCTYPE html>
<html>
<head>
<title>Visitor Pass - ${visitor.name}</title>
<style>${styleContent}</style>
</head>
<body>
${htmlContent}
<script>${scriptContent}<\/script>
</body>
</html>`;

    printWindow.document.write(printContent);
    printWindow.document.close();
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
              <QRCodeSVG data={qrData} size={64} />
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Host</span>
                <span className="font-medium">{hostName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Check-in</span>
                <span className="font-medium">{formatDateTime(visitor.checkIn)}</span>
              </div>
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
            <Button onClick={handlePrint} className="flex-1" variant="default">
              <Printer className="h-4 w-4 mr-2" />
              Print Pass
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
