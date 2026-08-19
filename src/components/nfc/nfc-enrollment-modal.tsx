"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";
import { NfcTapToPairButton } from "@/components/nfc/nfc-tap-to-pair-button";
import { NfcIcon, LinkIcon } from "lucide-react";

type NfcEnrollmentModalProps = {
  open: boolean;
  staffId: string;
  staffName: string;
  onPaired: (nfcTagId: string) => void;
  onClose: () => void;
};

export function NfcEnrollmentModal({ open, staffId, staffName, onPaired, onClose }: NfcEnrollmentModalProps) {
  const [manualTagId, setManualTagId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showManual, setShowManual] = useState(false);

  async function pairTag(nfcTagId: string) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/staff/${staffId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nfcTagId }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error || "Failed to pair NFC tag");
      } else {
        onPaired(nfcTagId);
        onClose();
      }
    } finally {
      setLoading(false);
    }
  }

  function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (manualTagId.trim()) pairTag(manualTagId.trim());
  }

  function handleClose() {
    setManualTagId("");
    setError("");
    setShowManual(false);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <NfcIcon className="h-5 w-5 text-primary" />
            Pair NFC Card
          </DialogTitle>
          <DialogDescription>
            Link an NFC card to <strong>{staffName}</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!showManual ? (
            <>
              {/* Web NFC scan button */}
              <NfcTapToPairButton
                onCardScanned={pairTag}
                onError={(err) => { setError(err); setShowManual(true); }}
              />
              <div className="relative flex items-center">
                <div className="flex-1 border-t" />
                <span className="mx-3 text-xs text-muted-foreground">or</span>
                <div className="flex-1 border-t" />
              </div>
              <Button
                type="button"
                variant="outline"
                className="w-full gap-2"
                onClick={() => setShowManual(true)}
              >
                <LinkIcon className="h-4 w-4" />
                Enter Tag ID Manually
              </Button>
            </>
          ) : (
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nfc-manual-tag-id">NFC Tag ID</Label>
                <Input
                  id="nfc-manual-tag-id"
                  value={manualTagId}
                  onChange={(e) => setManualTagId(e.target.value)}
                  placeholder="e.g. 04:A3:22:F1:9D"
                  autoFocus
                />
              </div>
              {error && <Alert variant="error">{error}</Alert>}
              <div className="flex gap-2">
                <Button type="submit" disabled={loading || !manualTagId.trim()} className="flex-1">
                  {loading ? "Pairing..." : "Pair Card"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowManual(false)}>
                  Back
                </Button>
              </div>
            </form>
          )}
          {error && !showManual && <Alert variant="error">{error}</Alert>}
        </div>
      </DialogContent>
    </Dialog>
  );
}
