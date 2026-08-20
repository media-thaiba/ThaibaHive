'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertOctagon, Bot, ShieldAlert } from 'lucide-react';

interface MarlAgentControlDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onEmergencyKillSwitch: () => Promise<void>;
}

export function MarlAgentControlDialog({
  isOpen,
  onClose,
  onEmergencyKillSwitch,
}: MarlAgentControlDialogProps) {
  const [isExecuting, setIsExecuting] = useState(false);

  const handleKillSwitch = async () => {
    setIsExecuting(true);
    try {
      await onEmergencyKillSwitch();
      onClose();
    } catch {
      // Handled by parent
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="border-slate-800 bg-slate-950 text-slate-100 sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center space-x-2">
            <Bot className="h-5 w-5 text-indigo-400" />
            <DialogTitle>MARL Multi-Agent Autonomous Guardrails</DialogTitle>
          </div>
          <DialogDescription className="text-xs text-slate-400">
            Multi-Agent Reinforcement Learning policy controls, human-in-the-loop approvals, and safety envelope kill-switches.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2 text-xs">
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-200">Active Domain Agents</span>
              <Badge variant="success">Converged (4/4)</Badge>
            </div>
            <div className="text-slate-400">
              HVAC Energy Optimizer · Fleet Logistics Dispatcher · Cloud Rightsizer · Resource Mesh Broker
            </div>
          </div>

          <div className="rounded-lg border border-red-900/40 bg-red-950/20 p-3">
            <div className="flex items-start space-x-2">
              <AlertOctagon className="h-4 w-4 text-red-400 mt-0.5" />
              <div>
                <div className="font-medium text-red-300">Global Operational Kill-Switch</div>
                <div className="mt-1 text-[11px] text-red-200/70">
                  Immediately halts all MARL autonomous optimizations and rolls back actuators to baseline static schedules.
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex justify-between sm:justify-between">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isExecuting}>
            Dismiss
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleKillSwitch}
            disabled={isExecuting}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            <ShieldAlert className="mr-1.5 h-4 w-4" />
            {isExecuting ? 'Halting...' : 'Trigger Global Kill-Switch'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
