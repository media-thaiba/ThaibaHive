'use client';

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Navigation, Footprints, Clock, CheckCircle } from 'lucide-react';

interface IndoorNavigationSheetProps {
  isOpen: boolean;
  onClose: () => void;
  targetSpaceName: string;
  targetSpaceCode: string;
}

export function IndoorNavigationSheet({
  isOpen,
  onClose,
  targetSpaceName,
  targetSpaceCode,
}: IndoorNavigationSheetProps) {
  const steps = [
    { step: 1, text: 'Start at Science Complex Main Entrance Lobby', distance: '0m' },
    { step: 2, text: 'Take Central Stairs or Elevator to Floor 1', distance: '15m' },
    { step: 3, text: 'Turn Right down Engineering Hallway East', distance: '25m' },
    { step: 4, text: `Arrive at ${targetSpaceName} (${targetSpaceCode}) on your left`, distance: '10m' },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Navigation className="h-5 w-5 text-sky-600" />
            <DialogTitle>Indoor 3D Wayfinding Navigation</DialogTitle>
          </div>
        </DialogHeader>
        <div className="space-y-4 pt-2 text-xs">
          <div className="flex items-center justify-between p-2.5 bg-sky-50 rounded-lg border border-sky-100">
            <div>
              <div className="font-bold text-sky-950 text-sm">{targetSpaceName}</div>
              <div className="text-sky-700">Room Code: {targetSpaceCode}</div>
            </div>
            <div className="text-right">
              <div className="font-bold text-slate-900 flex items-center gap-1">
                <Footprints className="h-3.5 w-3.5 text-slate-500" /> 50 meters
              </div>
              <div className="text-slate-500 flex items-center gap-1 mt-0.5">
                <Clock className="h-3 w-3" /> ~45 seconds
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="font-semibold text-slate-800">Turn-by-Turn Directions:</h4>
            <div className="space-y-2">
              {steps.map((s) => (
                <div key={s.step} className="flex items-start gap-2.5 p-2 rounded border border-slate-100 bg-slate-50/50">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[10px] font-bold text-slate-800">
                    {s.step}
                  </span>
                  <div className="flex-1">
                    <p className="text-slate-800 font-medium">{s.text}</p>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono">{s.distance}</span>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" onClick={onClose}>
              Close Navigation
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
