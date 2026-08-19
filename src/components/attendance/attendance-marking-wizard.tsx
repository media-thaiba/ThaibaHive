"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckIcon, ChevronRightIcon, NfcIcon, QrCodeIcon, PenLineIcon } from "lucide-react";

type MarkingMode = "nfc" | "qr" | "manual";

type AttendanceMarkingWizardProps = {
  onComplete: (record: { staffId?: string; method: MarkingMode; timestamp: string }) => void;
  staffId?: string;
};

export function AttendanceMarkingWizard({ onComplete, staffId }: AttendanceMarkingWizardProps) {
  const [step, setStep] = useState<"select" | "scan" | "confirm">("select");
  const [mode, setMode] = useState<MarkingMode | null>(null);
  const [loading, setLoading] = useState(false);

  function selectMode(m: MarkingMode) {
    setMode(m);
    setStep("scan");
  }

  async function handleConfirm() {
    setLoading(true);
    try {
      const res = await fetch("/api/attendance/check-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staffId, method: mode, timestamp: new Date().toISOString() }),
      });
      if (res.ok) {
        setStep("confirm");
        onComplete({ staffId, method: mode!, timestamp: new Date().toISOString() });
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Mark Attendance</CardTitle>
          <Badge variant="secondary">
            {step === "select" ? "1 / 3" : step === "scan" ? "2 / 3" : "3 / 3"}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          {step === "select" && "Choose your check-in method"}
          {step === "scan" && `${mode === "nfc" ? "NFC" : mode === "qr" ? "QR Code" : "Manual"} check-in`}
          {step === "confirm" && "Attendance marked!"}
        </p>
      </CardHeader>
      <CardContent>
        {step === "select" && (
          <div className="grid gap-3">
            <Button variant="outline" className="h-14 gap-3 justify-start" onClick={() => selectMode("nfc")}>
              <NfcIcon className="h-5 w-5 text-primary" />
              <div className="text-left">
                <div className="text-sm font-medium">NFC Card</div>
                <div className="text-xs text-muted-foreground">Tap your NFC card</div>
              </div>
            </Button>
            <Button variant="outline" className="h-14 gap-3 justify-start" onClick={() => selectMode("qr")}>
              <QrCodeIcon className="h-5 w-5 text-primary" />
              <div className="text-left">
                <div className="text-sm font-medium">QR Code</div>
                <div className="text-xs text-muted-foreground">Scan your QR code</div>
              </div>
            </Button>
            <Button variant="outline" className="h-14 gap-3 justify-start" onClick={() => selectMode("manual")}>
              <PenLineIcon className="h-5 w-5 text-muted-foreground" />
              <div className="text-left">
                <div className="text-sm font-medium">Manual Entry</div>
                <div className="text-xs text-muted-foreground">Enter attendance manually</div>
              </div>
            </Button>
          </div>
        )}

        {step === "scan" && (
          <div className="space-y-4">
            <div className="flex flex-col items-center justify-center py-8 gap-4 text-center">
              {mode === "nfc" && (
                <>
                  <div className="relative">
                    <div className="h-20 w-20 rounded-full border-4 border-primary/30 animate-pulse" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <NfcIcon className="h-8 w-8 text-primary" />
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">Tap your NFC card to the reader...</p>
                </>
              )}
              {mode === "qr" && <p className="text-sm text-muted-foreground">Open your QR scanner and scan your badge.</p>}
              {mode === "manual" && <p className="text-sm text-muted-foreground">Confirm your attendance for {new Date().toLocaleTimeString()}.</p>}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setStep("select")}>Back</Button>
              <Button className="flex-1 gap-2" onClick={handleConfirm} disabled={loading}>
                {loading ? "Marking..." : "Confirm"} <ChevronRightIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {step === "confirm" && (
          <div className="flex flex-col items-center gap-4 py-4 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <CheckIcon className="h-7 w-7 text-primary" />
            </div>
            <p className="font-medium text-sm">Attendance marked at {new Date().toLocaleTimeString()}</p>
            <Badge variant="success">Check-in Successful</Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
