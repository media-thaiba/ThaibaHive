'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ShieldCheck, PhoneCall, Footprints, AlertCircle, MapPin, HeartHandshake } from 'lucide-react';
import { IncidentReportModal } from './incident-report-modal';

export function SafetyStatusCanvas() {
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [safeWalkRequested, setSafeWalkRequested] = useState(false);

  const handleSafeWalkRequest = () => {
    setSafeWalkRequested(true);
    setTimeout(() => setSafeWalkRequested(false), 5000);
  };

  const handleReportSubmit = async (data: any) => {
    await fetch('/api/vision/alerts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cameraId: 'user_portal_report',
        threatType: data.threatType === 'other' ? 'loitering' : data.threatType,
        severity: 'medium',
        confidenceScore: 1.0,
        facilityId: 'fac_main',
        snapshotUrl: '',
      }),
    });
  };

  return (
    <div className="space-y-6">
      {/* Campus Status Banner */}
      <div className="p-6 bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-xl shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-emerald-200" />
            <span className="text-xl font-bold">Campus Safety Status: Normal</span>
          </div>
          <p className="text-sm text-emerald-100">
            All campus zones secure. Security escorts and 24/7 patrol officers on active duty.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            className="bg-white text-emerald-800 hover:bg-emerald-50 font-semibold"
            onClick={handleSafeWalkRequest}
          >
            <Footprints className="h-4 w-4 mr-1.5 text-emerald-600" />
            {safeWalkRequested ? 'Escort Dispatched!' : 'Request SafeWalk Escort'}
          </Button>
          <Button
            variant="default"
            className="bg-rose-500 hover:bg-rose-600 text-white font-semibold"
            onClick={() => setIsReportModalOpen(true)}
          >
            <AlertCircle className="h-4 w-4 mr-1.5" />
            Report Concern
          </Button>
        </div>
      </div>

      {safeWalkRequested && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-lg flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-3">
            <Footprints className="h-5 w-5 text-emerald-600 animate-pulse" />
            <div>
              <div className="font-semibold text-sm">SafeWalk Escort En Route</div>
              <div className="text-xs text-emerald-700">Guard Alpha-Patrol dispatched to your location. ETA: 2 minutes.</div>
            </div>
          </div>
          <Badge variant="success">Dispatched</Badge>
        </div>
      )}

      {/* Safety Services Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-slate-900">
              <Footprints className="h-5 w-5 text-indigo-600" />
              Student SafeWalk Escort
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-slate-600">
              Request a trained security guard or student safety volunteer to accompany you between library, dorms, and parking lots after dark.
            </p>
            <div className="text-xs font-semibold text-indigo-600 flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" /> Real-time GPS Tracking
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-slate-900">
              <PhoneCall className="h-5 w-5 text-rose-600" />
              24/7 Security Hotline
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-slate-600">
              Direct emergency dispatch connection to campus central dispatch and local emergency medical services (EMS).
            </p>
            <div className="text-sm font-bold text-rose-600">
              Ext: 4444 (Campus) | +1 (800) 555-SAFE
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-slate-900">
              <HeartHandshake className="h-5 w-5 text-emerald-600" />
              Privacy &amp; Data Rights
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-slate-600">
              All video footage is anonymized on-device with differential privacy guarantees. You can view or adjust your surveillance preferences.
            </p>
            <Badge variant="secondary">FERPA / GDPR Compliant</Badge>
          </CardContent>
        </Card>
      </div>

      <IncidentReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        onSubmitReport={handleReportSubmit}
      />
    </div>
  );
}
