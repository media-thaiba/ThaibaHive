'use client';

import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import { DeviceOverrideDialog } from './device-override-dialog';
import { Shield, ShieldAlert, Sliders } from 'lucide-react';

interface DeviceTrustProps {
  devices: any[];
  onApplyOverride: (deviceId: string, score: number, reason: string) => Promise<void>;
}

export function DeviceTrustMatrixTable({ devices, onApplyOverride }: DeviceTrustProps) {
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);

  const getTierBadge = (tier: string) => {
    switch (tier) {
      case 'HIGH_TRUST':
        return <Badge variant="success">High Trust</Badge>;
      case 'MEDIUM_TRUST':
        return <Badge variant="info">Medium Trust</Badge>;
      case 'LOW_TRUST':
        return <Badge variant="warning">Low Trust</Badge>;
      case 'UNTRUSTED':
        return <Badge variant="destructive">Untrusted</Badge>;
      default:
        return <Badge variant="secondary">{tier}</Badge>;
    }
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Device ID</TableHead>
            <TableHead>Trust Score</TableHead>
            <TableHead>Trust Tier</TableHead>
            <TableHead>Override Status</TableHead>
            <TableHead>Last Evaluated</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {devices.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                No active device trust records found.
              </TableCell>
            </TableRow>
          ) : (
            devices.map((d) => (
              <TableRow key={d.id || d.deviceId}>
                <TableCell className="font-mono text-sm">
                  <div className="flex items-center gap-2">
                    {d.score >= 80 ? (
                      <Shield className="h-4 w-4 text-success" />
                    ) : (
                      <ShieldAlert className="h-4 w-4 text-destructive" />
                    )}
                    {d.deviceId}
                  </div>
                </TableCell>
                <TableCell>
                  <span className="font-bold text-base">{d.score}</span>
                  <span className="text-xs text-muted-foreground"> / 100</span>
                </TableCell>
                <TableCell>{getTierBadge(d.tier)}</TableCell>
                <TableCell>
                  {d.isOverridden ? (
                    <Badge variant="warning">Admin Overridden</Badge>
                  ) : (
                    <Badge variant="secondary">Dynamic</Badge>
                  )}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {d.evaluatedAt ? new Date(d.evaluatedAt).toLocaleString() : 'Just now'}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedDevice(d.deviceId)}
                  >
                    <Sliders className="h-3.5 w-3.5 mr-1" />
                    Override
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {selectedDevice && (
        <DeviceOverrideDialog
          isOpen={!!selectedDevice}
          onClose={() => setSelectedDevice(null)}
          deviceId={selectedDevice}
          onApplyOverride={onApplyOverride}
        />
      )}
    </div>
  );
}
