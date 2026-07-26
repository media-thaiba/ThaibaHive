"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { QrScannerModal } from "./qr-scanner-modal";
import { NfcScannerModal } from "./nfc-scanner-modal";
import { ScanLineIcon, NfcIcon } from "lucide-react";

type CheckInPanelProps = {
  staff?: { id: string; nfcTagId?: string | null; role?: string } | null;
  onCheckInComplete: () => void;
};

export function CheckInPanel({ staff, onCheckInComplete }: CheckInPanelProps) {
  const [qrOpen, setQrOpen] = useState(false);
  const [nfcOpen, setNfcOpen] = useState(false);

  return (
    <>
      <Card className="animate-slide-up">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Check In</CardTitle>
            <Badge variant="warning">Not checked in</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Button
              variant="outline"
              className="h-auto py-4 flex flex-col items-center gap-2"
              onClick={() => setQrOpen(true)}
            >
              <ScanLineIcon className="h-6 w-6 text-primary" />
              <div className="text-center">
                <p className="text-sm font-medium">QR Code</p>
                <p className="text-xs text-muted-foreground">
                  Scan QR code from entrance
                </p>
              </div>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-4 flex flex-col items-center gap-2"
              onClick={() => setNfcOpen(true)}
            >
              <NfcIcon className="h-6 w-6 text-primary" />
              <div className="text-center">
                <p className="text-sm font-medium">NFC Card</p>
                <p className="text-xs text-muted-foreground">
                  Tap your NFC card
                </p>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>

      <QrScannerModal
        open={qrOpen}
        onOpenChange={setQrOpen}
        onSuccess={onCheckInComplete}
      />

      <NfcScannerModal
        open={nfcOpen}
        onOpenChange={setNfcOpen}
        onSuccess={onCheckInComplete}
        staff={staff}
      />
    </>
  );
}
