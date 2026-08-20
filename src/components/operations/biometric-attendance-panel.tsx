'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Fingerprint, CheckCircle2, ShieldCheck } from 'lucide-react';

interface BiometricAttendancePanelProps {
  logs: any[];
  totalCount: number;
  isLoading: boolean;
}

export function BiometricAttendancePanel({
  logs,
  totalCount,
  isLoading,
}: BiometricAttendancePanelProps) {
  if (isLoading) {
    return (
      <Card className="border-slate-800 bg-slate-950/60 shadow-md">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-slate-800 bg-slate-950/60 shadow-md">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center space-x-2">
          <Fingerprint className="h-5 w-5 text-emerald-400" />
          <CardTitle className="text-base font-semibold text-slate-100">
            Edge Biometrics & ZKP Attestation
          </CardTitle>
        </div>
        <Badge variant="success">Zero-Knowledge Verified</Badge>
      </CardHeader>

      <CardContent className="space-y-4 pt-2">
        <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/50 p-3 text-xs">
          <div>
            <div className="text-slate-400">Total Authenticated Events</div>
            <div className="text-lg font-bold text-emerald-400">{totalCount} punches</div>
          </div>
          <div className="flex items-center space-x-1 text-emerald-400">
            <ShieldCheck className="h-4 w-4" />
            <span className="text-[11px] font-medium">Privacy Preserved</span>
          </div>
        </div>

        <div className="max-h-48 space-y-2 overflow-y-auto pr-1">
          {logs.length === 0 ? (
            <div className="rounded border border-dashed border-slate-800 p-4 text-center text-xs text-slate-500">
              No recent edge attendance verification events logged.
            </div>
          ) : (
            logs.map((log, idx) => (
              <div
                key={log.id || idx}
                className="flex items-center justify-between rounded-md border border-slate-800 bg-slate-900/30 p-2 text-xs"
              >
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  <div>
                    <div className="font-medium text-slate-200">{log.userId}</div>
                    <div className="text-[10px] text-slate-400">
                      {log.locationName} · {log.verificationMethod}
                    </div>
                  </div>
                </div>
                <Badge variant="success" className="text-[10px]">
                  {log.syncStatus}
                </Badge>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
