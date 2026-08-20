/**
 * Chaos Emergency Kill-Switch Dialog
 * Sprint-042 (ARES) — ARES-022
 */

'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface ChaosKillSwitchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirmAbort: (reason: string) => Promise<void>;
}

export function ChaosKillSwitchDialog({ open, onOpenChange, onConfirmAbort }: ChaosKillSwitchDialogProps) {
  const [reason, setReason] = useState<string>('Administrative manual safety abort');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleAbort = async () => {
    setIsSubmitting(true);
    try {
      await onConfirmAbort(reason);
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="text-destructive font-bold">Emergency Chaos Kill-Switch</DialogTitle>
          <DialogDescription>
            Triggering the emergency kill-switch will immediately abort all active chaos injectors cluster-wide in &lt;
            100ms, restore network routing baselines, and reset all fault interceptors.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-3">
          <label className="text-xs font-medium text-foreground">Abort Justification Reason</label>
          <Input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason for triggering emergency kill-switch"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleAbort} disabled={isSubmitting || !reason.trim()}>
            {isSubmitting ? 'Aborting...' : 'Confirm Global Abort'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
