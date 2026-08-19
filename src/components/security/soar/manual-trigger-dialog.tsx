'use client';

/**
 * SOAR Manual Trigger Modal
 * Sprint-040 — Ad-Hoc Execution Launch
 */

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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectItem } from '@/components/ui/select';
import { SecurityPlaybook } from '@/lib/security/soar/soar-types';

interface ManualTriggerDialogProps {
  playbook: SecurityPlaybook;
  open: boolean;
  onClose: () => void;
  onExecute: (playbookId: string, targetType: string, targetValue: string, payload?: Record<string, any>) => Promise<boolean>;
}

export function ManualTriggerDialog({ playbook, open, onClose, onExecute }: ManualTriggerDialogProps) {
  const [targetType, setTargetType] = useState('IP');
  const [targetValue, setTargetValue] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetValue.trim()) return;

    setSubmitting(true);
    try {
      const payload: Record<string, any> = {
        indicator_value: targetValue.trim(),
        user_id: targetValue.trim(),
        ip: targetValue.trim(),
        subnet_cidr: targetValue.trim(),
      };

      const success = await onExecute(playbook.id, targetType, targetValue.trim(), payload);
      if (success) {
        onClose();
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Manual Trigger: {playbook.name}</DialogTitle>
            <DialogDescription className="text-xs">
              Execute this security playbook against a specific network or identity target entity
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="target-type" className="text-xs font-medium">Target Entity Type</Label>
              <Select
                id="target-type"
                value={targetType}
                onChange={(e) => setTargetType(e.target.value)}
              >
                <SelectItem value="IP">IP Address</SelectItem>
                <SelectItem value="SUBNET">CIDR Subnet</SelectItem>
                <SelectItem value="USER">User ID</SelectItem>
                <SelectItem value="DOMAIN">Domain Name</SelectItem>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="target-val" className="text-xs font-medium">Target Value</Label>
              <Input
                id="target-val"
                placeholder={targetType === 'IP' ? '198.51.100.22' : targetType === 'USER' ? 'usr_8492' : '192.168.1.0/24'}
                value={targetValue}
                onChange={(e) => setTargetValue(e.target.value)}
                required
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" variant="default" disabled={submitting || !targetValue.trim()}>
              {submitting ? 'Dispatching...' : 'Execute Playbook'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
