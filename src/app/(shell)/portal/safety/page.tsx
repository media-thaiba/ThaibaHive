'use client';

import React from 'react';
import { SafetyStatusCanvas } from '@/components/portal/safety-status-canvas';
import { Badge } from '@/components/ui/badge';
import { Shield } from 'lucide-react';

export default function StakeholderSafetyPortalPage() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Shield className="h-6 w-6 text-emerald-600" />
            Campus Safety &amp; SafeWalk Portal
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time campus security status, SafeWalk walking escort requests, emergency assistance, and hazard reporting
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="success">All Zones Normal</Badge>
          <Badge variant="info">24/7 Shield Active</Badge>
        </div>
      </div>

      <SafetyStatusCanvas />
    </div>
  );
}
