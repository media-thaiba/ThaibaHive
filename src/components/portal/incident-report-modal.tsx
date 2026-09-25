'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert } from '@/components/ui/alert';
import { ShieldCheck, AlertCircle } from 'lucide-react';

interface IncidentReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitReport: (data: { location: string; description: string; threatType: string }) => Promise<void>;
}

export function IncidentReportModal({ isOpen, onClose, onSubmitReport }: IncidentReportModalProps) {
  const [location, setLocation] = useState('Science Quad');
  const [threatType, setThreatType] = useState('slip_and_fall');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;

    try {
      setLoading(true);
      await onSubmitReport({ location, description, threatType });
      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        onClose();
      }, 1500);
    } catch {} finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-slate-900">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            Report Safety Concern / Hazard
          </DialogTitle>
        </DialogHeader>

        {submitted ? (
          <div className="py-6 flex flex-col items-center justify-center space-y-2 text-center">
            <ShieldCheck className="h-10 w-10 text-emerald-500 animate-bounce" />
            <div className="font-semibold text-slate-900">Report Dispatched to Campus Security</div>
            <div className="text-xs text-slate-500">Security guards and dispatch have been notified.</div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="rep-location">Location / Building</Label>
              <Input
                id="rep-location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Science Wing Corridor 2"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="rep-type">Concern Category</Label>
              <select
                id="rep-type"
                value={threatType}
                onChange={(e) => setThreatType(e.target.value)}
                className="w-full h-10 px-3 border border-slate-300 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="slip_and_fall">Wet Floor / Slip &amp; Fall Hazard</option>
                <option value="unresponsive_person">Medical Assistance / Unresponsive</option>
                <option value="loitering">Suspicious Activity / Loitering</option>
                <option value="other">Other Safety Concern</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="rep-desc">Description</Label>
              <textarea
                id="rep-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what you observed..."
                rows={3}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                required
              />
            </div>

            <DialogFooter className="flex justify-end gap-2 pt-3">
              <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
                Cancel
              </Button>
              <Button type="submit" variant="default" disabled={loading} className="bg-amber-600 hover:bg-amber-700">
                {loading ? 'Sending...' : 'Submit Report'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
