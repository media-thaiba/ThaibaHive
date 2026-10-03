'use client';

import React from 'react';
import { SpaceDiscoveryCanvas } from '@/components/twin/portal/space-discovery-canvas';
import { Badge } from '@/components/ui/badge';
import { Compass } from 'lucide-react';
import { PermissionGate } from '@/components/ui/permission-gate';

export default function FacilitiesDiscoveryPage() {
  return (
    <PermissionGate anyOf={["bookings:read", "bookings:create", "facility:equipment:view"]} fallback={<div className="p-8 text-center text-muted-foreground">Access requires facility permissions.</div>}>
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Compass className="h-6 w-6 text-sky-600" />
              Campus Space Discovery &amp; Smart Booking
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Explore live study spaces, view environmental comfort metrics, and reserve rooms with real-time 3D wayfinding
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="success">Live Comfort Radar</Badge>
          </div>
        </div>

        <SpaceDiscoveryCanvas />
      </div>
    </PermissionGate>
  );
}
