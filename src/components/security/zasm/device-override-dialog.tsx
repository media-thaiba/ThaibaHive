'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface OverrideDialogProps {
  isOpen: boolean;
  onClose: () => void;
  deviceId: string;
  onApplyOverride: (deviceId: string, score: number, reason: string) => Promise<void>;
}

export function DeviceOverrideDialog({
  isOpen,
  onClose,
  deviceId,
  onApplyOverride,
}: OverrideDialogProps) {
  const [score, setScore] = useState<number>(85);
  const [reason, setReason] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason) return;
    setSubmitting(true);
    try {
      await onApplyOverride(deviceId, score, reason);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Override Device Trust Score</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1">
            <Label htmlFor="deviceId">Target Device ID</Label>
            <Input id="deviceId" value={deviceId} disabled />
          </div>
          <div className="space-y-1">
            <Label htmlFor="forcedScore">Forced Trust Score (0 - 100)</Label>
            <Input
              id="forcedScore"
              type="number"
              min={0}
              max={100}
              value={score}
              onChange={(e) => setScore(parseInt(e.target.value, 10) || 0)}
              required
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="reason">Administrative Justification</Label>
            <Input
              id="reason"
              placeholder="e.g. VIP executive laptop on emergency travel"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
            />
          </div>
          <DialogFooter className="flex justify-end gap-2 pt-2">
            <Button variant="outline" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || !reason}>
              {submitting ? 'Applying...' : 'Apply Override'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
