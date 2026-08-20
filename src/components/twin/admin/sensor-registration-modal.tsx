'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface SensorRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRegister: (sensorData: any) => void;
}

export function SensorRegistrationModal({ isOpen, onClose, onRegister }: SensorRegistrationModalProps) {
  const [sensorId, setSensorId] = useState('');
  const [facilityId, setFacilityId] = useState('FAC-SEC-01');
  const [spaceId, setSpaceId] = useState('SEC-101');
  const [sensorType, setSensorType] = useState('temperature');
  const [protocol, setProtocol] = useState('mqtt');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sensorId) return;
    onRegister({
      sensorId,
      facilityId,
      spaceId,
      sensorType,
      protocol,
      samplingIntervalSeconds: 60,
    });
    setSensorId('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Register IoT Sensor</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3 text-xs pt-2">
          <div className="space-y-1">
            <Label htmlFor="sensorId">Sensor ID / Serial</Label>
            <Input
              id="sensorId"
              value={sensorId}
              onChange={(e) => setSensorId(e.target.value)}
              placeholder="e.g. SEN-AIR-101"
              required
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="facilityId">Facility</Label>
            <Input
              id="facilityId"
              value={facilityId}
              onChange={(e) => setFacilityId(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="spaceId">Space / Room ID</Label>
            <Input
              id="spaceId"
              value={spaceId}
              onChange={(e) => setSpaceId(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor="sensorType">Sensor Type</Label>
              <Input
                id="sensorType"
                value={sensorType}
                onChange={(e) => setSensorType(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="protocol">Protocol</Label>
              <Input
                id="protocol"
                value={protocol}
                onChange={(e) => setProtocol(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter className="pt-3">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">
              Register Sensor
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
