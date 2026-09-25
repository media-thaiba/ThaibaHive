'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert } from '@/components/ui/alert';
import { ShieldAlert, AlertTriangle } from 'lucide-react';

interface LockdownModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmLockdown: (scope: string, facilityId: string, reason: string) => Promise<void>;
}

export function LockdownModal({ isOpen, onClose, onConfirmLockdown }: LockdownModalProps) {
  const [scope, setScope] = useState('campus_wide');
  const [facilityId, setFacilityId] = useState('fac_main');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('Please provide a reason for initiating lockdown.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await onConfirmLockdown(scope, facilityId, reason);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to trigger emergency lockdown.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-rose-600">
            <ShieldAlert className="h-5 w-5" />
            Initiate Emergency Campus Lockdown
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Alert variant="error" className="border-rose-300 bg-rose-50 text-rose-900">
            <AlertTriangle className="h-4 w-4 text-rose-600 mr-2" />
            <span>
              <strong>Life Safety Notice:</strong> All magnetic egress points will secure against ingress while maintaining NFPA-compliant egress. Emergency illumination will activate.
            </span>
          </Alert>

          {error && <div className="text-sm text-rose-600 font-medium">{error}</div>}

          <div className="space-y-2">
            <Label htmlFor="scope">Lockdown Scope</Label>
            <select
              id="scope"
              value={scope}
              onChange={(e) => setScope(e.target.value)}
              className="w-full h-10 px-3 border border-slate-300 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
            >
              <option value="campus_wide">Campus-Wide Full Lockdown</option>
              <option value="facility">Specific Facility Only</option>
              <option value="zone">Single High-Risk Zone</option>
            </select>
          </div>

          {scope !== 'campus_wide' && (
            <div className="space-y-2">
              <Label htmlFor="facilityId">Target Facility</Label>
              <Input
                id="facilityId"
                value={facilityId}
                onChange={(e) => setFacilityId(e.target.value)}
                placeholder="e.g. fac_science_block"
                className="w-full"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="reason">Incident / Threat Reason</Label>
            <Input
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Armed intruder report at North Quad"
              className="w-full"
              required
            />
          </div>

          <DialogFooter className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" variant="destructive" disabled={loading}>
              {loading ? 'Actuating Gates...' : 'ACTIVATE LOCKDOWN'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
