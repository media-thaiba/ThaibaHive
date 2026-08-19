"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Smartphone, Loader2 } from "lucide-react";

interface NfcTapToPairButtonProps {
  onCardScanned: (tagId: string) => void;
  onError: (error: string) => void;
}

export function NfcTapToPairButton({ onCardScanned, onError }: NfcTapToPairButtonProps) {
  const [scanning, setScanning] = useState(false);

  const startScan = async () => {
    if (!("NDEFReader" in window)) {
      setScanning(true);
      setTimeout(() => {
        setScanning(false);
        onError("Web NFC not supported. Enter tag ID manually.");
      }, 500);
      return;
    }

    try {
      setScanning(true);
      const reader = new (window as unknown as { NDEFReader: new () => { scan: () => Promise<void>; addEventListener: (e: string, cb: (ev: { message: { records: { data?: ArrayBuffer }[] } }) => void) => void } }).NDEFReader();
      await reader.scan();
      reader.addEventListener("reading", ({ message }) => {
        const record = message.records[0];
        if (record.data) {
          const decoder = new TextDecoder();
          const tagId = decoder.decode(record.data);
          onCardScanned(tagId);
        }
        setScanning(false);
      });
    } catch (err) {
      setScanning(false);
      onError(err instanceof Error ? err.message : "NFC scan failed");
    }
  };

  return (
    <Button type="button" variant="outline" className="gap-2 w-full" onClick={startScan} disabled={scanning}>
      {scanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Smartphone className="h-4 w-4" />}
      {scanning ? "Scanning..." : "Tap Card to Pair"}
    </Button>
  );
}
