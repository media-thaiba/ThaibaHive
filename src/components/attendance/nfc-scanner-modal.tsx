"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  NfcIcon,
  SmartphoneIcon,
  MapPinIcon,
  AlertTriangleIcon,
} from "lucide-react";
import { toast } from "sonner";

type NfcScannerModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  staff?: { id: string; nfcTagId?: string | null } | null;
  _devSimulatedLatitude?: number;
  _devSimulatedLongitude?: number;
  devSimulatedWifiSsid?: string;
};

type Location = {
  id: string;
  name: string;
  nfcTagId: string | null;
  latitude: number | null;
  longitude: number | null;
};

export function NfcScannerModal({
  open,
  onOpenChange,
  onSuccess,
  staff,
  _devSimulatedLatitude: _lat,
  _devSimulatedLongitude: _lon,
  devSimulatedWifiSsid,
}: NfcScannerModalProps) {
  const [nfcSupported, setNfcSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [locations, setLocations] = useState<Location[]>([]);
  const isDev = process.env.NODE_ENV !== "production";

  useEffect(() => {
    setNfcSupported("NDEFReader" in window);
  }, []);

  useEffect(() => {
    if (open && isDev) {
      fetch("/api/admin/attendance-locations")
        .then((r) => (r.ok ? r.json() : { locations: [] }))
        .then((d) => setLocations(d.locations || []))
        .catch(() => {});
    }
  }, [open, isDev]);

  const handleNfcScan = useCallback(
    async (tagId: string) => {
      setSubmitting(true);
      try {
        const pos = await getGeolocation();
        const res = await fetch("/api/attendance/check-in", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            method: "nfc",
            nfcTagId: tagId,
            latitude: pos?.latitude,
            longitude: pos?.longitude,
            accuracy: pos?.accuracy,
            wifiSsid: devSimulatedWifiSsid,
          }),
        });
        const data = await res.json();
        if (res.ok) {
          toast.success("Checked in successfully!");
          onOpenChange(false);
          onSuccess();
        } else {
          toast.error(data.error || "Check-in failed");
        }
      } catch {
        toast.error("Check-in failed. Please try again.");
      } finally {
        setSubmitting(false);
      }
    },
    [onOpenChange, onSuccess, devSimulatedWifiSsid]
  );

  useEffect(() => {
    if (!open || !nfcSupported || !("NDEFReader" in window)) return;
    let abortController: AbortController | null = null;

    async function startListening() {
      try {
        const ndef = new (window as unknown as { NDEFReader: new () => NDEFReader }).NDEFReader();
        abortController = new AbortController();
        await ndef.scan({ signal: abortController.signal });
        setListening(true);
        ndef.addEventListener("reading", (event: unknown) => {
          const e = event as { serialNumber: string };
          if (e.serialNumber) handleNfcScan(e.serialNumber);
        });
      } catch {
        setListening(false);
      }
    }

    startListening();
    return () => {
      abortController?.abort();
      setListening(false);
    };
  }, [open, nfcSupported, handleNfcScan]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton={!submitting}>
        <DialogHeader>
          <DialogTitle>NFC Check-In</DialogTitle>
          <DialogDescription>
            Hold your NFC card near the device to check in.
          </DialogDescription>
        </DialogHeader>

        {!nfcSupported ? (
          <div className="flex flex-col items-center gap-3 py-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-warning/10 text-warning">
              <AlertTriangleIcon className="h-6 w-6" />
            </div>
            <p className="text-sm text-muted-foreground text-center">
              Web NFC is not supported on this device. Use an Android device
              with Chrome or Samsung Internet, or check in via QR code.
            </p>
          </div>
        ) : submitting ? (
          <div className="flex flex-col items-center gap-3 py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="text-sm text-muted-foreground">Processing...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 py-6">
            <div
              className={`flex h-16 w-16 items-center justify-center rounded-2xl ${
                listening
                  ? "bg-success/10 text-success animate-pulse"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              <NfcIcon className="h-8 w-8" />
            </div>
            <p className="text-sm text-muted-foreground">
              {listening
                ? "Listening for NFC tag..."
                : "Initializing NFC reader..."}
            </p>
            {listening && (
              <Badge variant="success" className="text-xs">
                Active
              </Badge>
            )}
          </div>
        )}

        {isDev && (
          <div className="border-t pt-3 space-y-3">
            <p className="text-xs font-medium text-muted-foreground">
              Dev: Simulate NFC Scan
            </p>
            {staff?.nfcTagId && (
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => handleNfcScan(staff.nfcTagId!)}
                disabled={submitting}
              >
                <SmartphoneIcon className="h-4 w-4 mr-2" />
                Tap Personal NFC Card
                <Badge variant="secondary" className="ml-auto font-mono text-[10px]">
                  {staff.nfcTagId}
                </Badge>
              </Button>
            )}
            {locations.filter((l) => l.nfcTagId).length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[11px] text-muted-foreground">
                  Tap Location NFC Tag:
                </p>
                {locations
                  .filter((l) => l.nfcTagId)
                  .map((loc) => (
                    <Button
                      key={loc.id}
                      variant="outline"
                      size="sm"
                      className="w-full justify-start text-xs"
                      onClick={() => handleNfcScan(loc.nfcTagId!)}
                      disabled={submitting}
                    >
                      <MapPinIcon className="h-3.5 w-3.5 mr-2" />
                      {loc.name}
                      <Badge variant="secondary" className="ml-auto font-mono text-[10px]">
                        {loc.nfcTagId}
                      </Badge>
                    </Button>
                  ))}
              </div>
            )}
            {!staff?.nfcTagId &&
              locations.filter((l) => l.nfcTagId).length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-2">
                  No NFC tags registered. Assign a personal NFC card in your
                  staff profile or register location tags in admin settings.
                </p>
              )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function getGeolocation(): Promise<{
  latitude: number;
  longitude: number;
  accuracy: number;
} | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
      },
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });
}

interface NDEFReader {
  scan(options?: { signal?: AbortSignal }): Promise<void>;
  addEventListener(type: string, listener: (event: unknown) => void): void;
}
