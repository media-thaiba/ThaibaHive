'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface RoomBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  spaceName: string;
  spaceCode: string;
  onConfirm: (bookingDetails: any) => void;
}

export function RoomBookingModal({ isOpen, onClose, spaceName, spaceCode, onConfirm }: RoomBookingModalProps) {
  const [purpose, setPurpose] = useState('');
  const [startTime, setStartTime] = useState('14:00');
  const [duration, setDuration] = useState('60');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!purpose) return;
    onConfirm({
      spaceCode,
      purpose,
      startTime,
      durationMinutes: Number(duration),
    });
    setPurpose('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Book Space: {spaceName} ({spaceCode})</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3 text-xs pt-2">
          <div className="space-y-1">
            <Label htmlFor="purpose">Purpose / Meeting Title</Label>
            <Input
              id="purpose"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="e.g. Capstone Project Team Sync"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor="startTime">Start Time</Label>
              <Input
                id="startTime"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="duration">Duration (Minutes)</Label>
              <Input
                id="duration"
                type="number"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter className="pt-3">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">
              Confirm Reservation
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
