'use client';

import React, { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { VisionRadarTab } from '@/components/operations/vision/vision-radar-tab';
import { ThreatDetectionTab } from '@/components/operations/vision/threat-detection-tab';
import { GuardDispatchTab } from '@/components/operations/vision/guard-dispatch-tab';
import { AlprAccessTab } from '@/components/operations/vision/alpr-access-tab';
import { PrivacyAuditTab } from '@/components/operations/vision/privacy-audit-tab';
import { LockdownModal } from '@/components/operations/vision/lockdown-modal';
import { Activity, ShieldAlert, Navigation, Car, Lock, AlertTriangle } from 'lucide-react';

export default function VisionShieldCockpitPage() {
  const [activeTab, setActiveTab] = useState('radar');
  const [isLockdownModalOpen, setIsLockdownModalOpen] = useState(false);

  const handleConfirmLockdown = async (scope: string, facilityId: string, reason: string) => {
    const res = await fetch('/api/vision/lockdown', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scope,
        targetFacilityId: facilityId,
        reason,
        triggerEcoMeshIslanding: true,
      }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to trigger lockdown');
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Autonomous Campus Safety &amp; AI Vision Shield Command Cockpit
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time Edge AI vision analytics, TWIN-OPS 3D spatial radar, ALPR gate control, guard routing &amp; emergency lockdown
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="success">YOLOv11x + DeepSORT Active</Badge>
          <Badge variant="info">v3.34.0 SafeCampus OS</Badge>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setIsLockdownModalOpen(true)}
            className="flex items-center gap-1.5 font-semibold"
          >
            <AlertTriangle className="h-4 w-4" /> LOCKDOWN
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-2 sm:grid-cols-5 w-full max-w-4xl">
          <TabsTrigger value="radar" className="flex items-center gap-1.5">
            <Activity className="h-4 w-4" />
            3D Vision Radar
          </TabsTrigger>
          <TabsTrigger value="threats" className="flex items-center gap-1.5">
            <ShieldAlert className="h-4 w-4" />
            Threat Alerts &amp; Incidents
          </TabsTrigger>
          <TabsTrigger value="guards" className="flex items-center gap-1.5">
            <Navigation className="h-4 w-4" />
            Guard Dispatch
          </TabsTrigger>
          <TabsTrigger value="alpr" className="flex items-center gap-1.5">
            <Car className="h-4 w-4" />
            ALPR &amp; Gate Access
          </TabsTrigger>
          <TabsTrigger value="privacy" className="flex items-center gap-1.5">
            <Lock className="h-4 w-4" />
            Privacy Vault
          </TabsTrigger>
        </TabsList>

        <TabsContent value="radar">
          <VisionRadarTab onTriggerLockdownClick={() => setIsLockdownModalOpen(true)} />
        </TabsContent>

        <TabsContent value="threats">
          <ThreatDetectionTab />
        </TabsContent>

        <TabsContent value="guards">
          <GuardDispatchTab />
        </TabsContent>

        <TabsContent value="alpr">
          <AlprAccessTab />
        </TabsContent>

        <TabsContent value="privacy">
          <PrivacyAuditTab />
        </TabsContent>
      </Tabs>

      <LockdownModal
        isOpen={isLockdownModalOpen}
        onClose={() => setIsLockdownModalOpen(false)}
        onConfirmLockdown={handleConfirmLockdown}
      />
    </div>
  );
}
