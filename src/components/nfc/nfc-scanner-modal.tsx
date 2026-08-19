"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type NfcScannerModalProps = {
  open: boolean;
  mode: "check-in" | "enrollment";
  onScan: (tagId: string) => void;
  onClose: () => void;
};

function NfcScanAnimation() {
  return (
    <div className="flex flex-col items-center justify-center py-8 gap-4">
      <div className="relative flex items-center justify-center">
        <div className="h-24 w-24 rounded-full border-4 border-primary/30 animate-pulse" />
        <div className="absolute h-16 w-16 rounded-full border-4 border-primary animate-ping" />
        <div className="absolute h-8 w-8 rounded-full bg-primary/20" />
      </div>
      <p className="text-sm text-muted-foreground animate-pulse">Tap your NFC card to the reader...</p>
    </div>
  );
}

export default function NfcScannerModal({ open, mode, onScan, onClose }: NfcScannerModalProps) {
  const [manualTagId, setManualTagId] = useState("");
  const [showManual, setShowManual] = useState(false);

  function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (manualTagId.trim()) {
      onScan(manualTagId.trim());
      setManualTagId("");
      setShowManual(false);
    }
  }

  function handleClose() {
    setManualTagId("");
    setShowManual(false);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {mode === "enrollment" ? "Enroll NFC Card" : "NFC Check-In"}
          </DialogTitle>
          <DialogDescription>
            {mode === "enrollment"
              ? "Tap the NFC card to link it to your account."
              : "Tap your NFC card to check in."}
          </DialogDescription>
        </DialogHeader>

        {!showManual ? (
          <>
            <NfcScanAnimation />
            <div className="text-center">
              <Button variant="link" size="sm" onClick={() => setShowManual(true)}>
                Enter tag ID manually
              </Button>
            </div>
          </>
        ) : (
          <form onSubmit={handleManualSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">NFC Tag ID</label>
              <Input
                value={manualTagId}
                onChange={(e) => setManualTagId(e.target.value)}
                placeholder="Paste or type the tag ID"
                autoFocus
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={!manualTagId.trim()}>
                Submit
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowManual(false)}>
                Back to scanner
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
