"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import jsQR from "jsqr";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CameraIcon, RefreshCwIcon, AlertTriangleIcon } from "lucide-react";
import { toast } from "sonner";

type QrScannerModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
};

export function QrScannerModal({
  open,
  onOpenChange,
  onSuccess,
}: QrScannerModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onSuccessRef = useRef(onSuccess);
  const onOpenChangeRef = useRef(onOpenChange);

  useEffect(() => {
    onSuccessRef.current = onSuccess;
  }, [onSuccess]);

  useEffect(() => {
    onOpenChangeRef.current = onOpenChange;
  }, [onOpenChange]);

  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [manualInput, setManualInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const isDev = process.env.NODE_ENV !== "production";

  const stopStream = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setScanning(false);
  }, []);

  const submitQrPayload = useCallback(
    async (payload: string) => {
      stopStream();
      setSubmitting(true);
      try {
        const pos = await getGeolocation();
        const res = await fetch("/api/attendance/check-in", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            method: "qr",
            qrCode: payload,
            latitude: pos?.latitude,
            longitude: pos?.longitude,
            accuracy: pos?.accuracy,
          }),
        });
        const data = await res.json();
        if (res.ok) {
          toast.success("Checked in successfully!");
          onOpenChangeRef.current(false);
          onSuccessRef.current();
        } else {
          toast.error(data.error || "Check-in failed");
        }
      } catch {
        toast.error("Check-in failed. Please try again.");
      } finally {
        setSubmitting(false);
      }
    },
    [stopStream]
  );

  const submitRef = useRef(submitQrPayload);

  useEffect(() => {
    submitRef.current = submitQrPayload;
  }, [submitQrPayload]);

  const startStream = useCallback(async () => {
    if (!open) return;
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setScanning(true);
      intervalRef.current = setInterval(() => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA)
          return;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        if (code) {
          submitRef.current(code.data);
        }
      }, 200);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to access camera";
      setCameraError(msg);
    }
  }, [open]);

  useEffect(() => {
    if (open) {
      startStream();
    } else {
      stopStream();
    }
    return stopStream;
  }, [open, startStream, stopStream]);

  useEffect(() => {
    function handleVisibility() {
      if (document.hidden) {
        stopStream();
      } else if (open) {
        startStream();
      }
    }
    document.addEventListener("visibilitychange", handleVisibility);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibility);
  }, [open, startStream, stopStream]);

  async function handleManualSubmit() {
    if (!manualInput.trim()) return;
    submitQrPayload(manualInput.trim());
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton={!submitting}>
        <DialogHeader>
          <DialogTitle>QR Code Check-In</DialogTitle>
          <DialogDescription>
            Point your camera at the QR code displayed at the entrance.
          </DialogDescription>
        </DialogHeader>

        {cameraError ? (
          <div className="flex flex-col items-center gap-3 py-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-warning/10 text-warning">
              <AlertTriangleIcon className="h-6 w-6" />
            </div>
            <p className="text-sm text-muted-foreground text-center">
              {cameraError}
            </p>
            <Button variant="outline" onClick={startStream}>
              <RefreshCwIcon className="h-4 w-4 mr-1.5" />
              Retry
            </Button>
          </div>
        ) : (
          <div className="relative overflow-hidden rounded-xl bg-black">
            <video
              ref={videoRef}
              className="h-64 w-full object-cover"
              playsInline
              muted
              autoPlay
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-48 w-48 rounded-2xl border-2 border-white/60" />
            </div>
            {!scanning && !submitting && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <CameraIcon className="h-10 w-10 text-white/70 animate-pulse" />
              </div>
            )}
            {submitting && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <div className="flex flex-col items-center gap-2">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <p className="text-xs text-white">Submitting...</p>
                </div>
              </div>
            )}
          </div>
        )}

        <canvas ref={canvasRef} className="hidden" />

        {isDev && (
          <div className="border-t pt-3">
            <p className="text-xs text-muted-foreground mb-2">
              Dev: Paste QR payload
            </p>
            <div className="flex gap-2">
              <Input
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                placeholder="Paste base64url QR payload..."
                disabled={submitting}
                className="font-mono text-xs"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleManualSubmit}
                disabled={submitting || !manualInput.trim()}
              >
                Submit
              </Button>
            </div>
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
