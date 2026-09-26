'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface GeofenceDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (geofence: any) => void;
}

export function GeofenceDrawer({ isOpen, onClose, onSave }: GeofenceDrawerProps) {
  const [name, setName] = useState('');
  const [severity, setSeverity] = useState('critical');
  const [facilityId, setFacilityId] = useState('Science Complex');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    onSave({
      geofenceId: `GEO_${Date.now()}`,
      name,
      severity,
      facilityId,
    });
    setName('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Configure Geofence Perimeter</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3 text-xs pt-2">
          <div className="space-y-1">
            <Label htmlFor="geoName">Perimeter Name</Label>
            <Input
              id="geoName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Cleanroom Restricted Zone"
              required
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="geoSeverity">Breach Severity Alert</Label>
            <Input
              id="geoSeverity"
              value={severity}
              onChange={(e) => setSeverity(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="geoFacility">Facility / Building</Label>
            <Input
              id="geoFacility"
              value={facilityId}
              onChange={(e) => setFacilityId(e.target.value)}
            />
          </div>

          <DialogFooter className="pt-3">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">
              Save Geofence
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
