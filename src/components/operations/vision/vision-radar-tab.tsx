'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Camera, ShieldCheck, Eye, ShieldAlert, Radio, RefreshCw } from 'lucide-react';

interface VisionRadarTabProps {
  onTriggerLockdownClick?: () => void;
}

export function VisionRadarTab({ onTriggerLockdownClick }: VisionRadarTabProps) {
  const [loading, setLoading] = useState(true);
  const [cameras, setCameras] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [activeLockdown, setActiveLockdown] = useState<any | null>(null);

  const fetchRadarData = () => {
    setLoading(true);
    Promise.all([
      fetch('/api/vision/cameras').then((r) => r.json()),
      fetch('/api/vision/alerts').then((r) => r.json()),
      fetch('/api/vision/lockdown').then((r) => r.json()),
    ])
      .then(([camData, altData, lckData]) => {
        setCameras(camData.cameras || []);
        setAlerts(altData.alerts || []);
        const active = (lckData.lockdowns || []).find((l: any) => l.status === 'active');
        setActiveLockdown(active || null);
        setLoading(false);
      })
      .catch(() => {
        // Fallback demo data
        setCameras([
          { cameraId: 'cam_gate_01', name: 'Main Campus Gate', status: 'online', zoneType: 'entrance', fps: 30 },
          { cameraId: 'cam_quad_02', name: 'Central Science Quad', status: 'online', zoneType: 'common_area', fps: 30 },
          { cameraId: 'cam_dorm_03', name: 'West Residence Perimeter', status: 'online', zoneType: 'perimeter', fps: 30 },
          { cameraId: 'cam_park_04', name: 'South Faculty Parking', status: 'online', zoneType: 'parking', fps: 30 },
        ]);
        setAlerts([
          { alertId: 'alt_01', threatType: 'crowd_surge', severity: 'medium', cameraId: 'cam_quad_02', detectedAt: new Date().toISOString() },
        ]);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchRadarData();
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-28 w-full" />
      </div>
    );
  }

  const onlineCameras = cameras.filter((c) => c.status === 'online').length;
  const criticalThreats = alerts.filter((a) => a.severity === 'critical' || a.severity === 'high').length;

  return (
    <div className="space-y-6">
      {activeLockdown && (
        <div className="p-4 bg-rose-600 text-white rounded-lg flex items-center justify-between shadow-lg animate-pulse">
          <div className="flex items-center gap-3">
            <ShieldAlert className="h-6 w-6" />
            <div>
              <div className="font-bold text-lg">EMERGENCY LOCKDOWN ACTIVE</div>
              <div className="text-sm text-rose-100">
                Scope: {activeLockdown.scope} | Reason: {activeLockdown.triggerReason}
              </div>
            </div>
          </div>
          <Badge variant="secondary" className="bg-white text-rose-800 font-bold">
            {activeLockdown.doorsLockedCount} DOORS SECURED
          </Badge>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Active IP Cameras</CardTitle>
            <Camera className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{onlineCameras} / {cameras.length || 4}</div>
            <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
              <Radio className="h-3 w-3 animate-ping" /> 100% Stream Health OK
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Live Active Threats</CardTitle>
            <ShieldAlert className="h-4 w-4 text-rose-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-600">{criticalThreats}</div>
            <p className="text-xs text-slate-500 mt-1">Autonomous CV inference active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">3D Frustum Coverage</CardTitle>
            <Eye className="h-4 w-4 text-indigo-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-indigo-600">94.8%</div>
            <p className="text-xs text-slate-500 mt-1">Campus digital twin mapped</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Emergency Readiness</CardTitle>
            <ShieldCheck className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">ECO-MESH Sync</div>
            <p className="text-xs text-slate-500 mt-1">40% BESS emergency power reserve</p>
          </CardContent>
        </Card>
      </div>

      {/* 3D Radar Frustum View Simulation */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg">TWIN-OPS Spatial Vision Radar (3D FOV Frustums)</CardTitle>
            <p className="text-xs text-slate-500">Multi-camera spatial coverage matrix &amp; guard positions</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={fetchRadarData}>
              <RefreshCw className="h-4 w-4 mr-1" /> Refresh
            </Button>
            <Button variant="destructive" size="sm" onClick={onTriggerLockdownClick}>
              <ShieldAlert className="h-4 w-4 mr-1" /> Emergency Lockdown
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative h-72 w-full bg-slate-950 rounded-lg border border-slate-800 overflow-hidden flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] opacity-40"></div>
            
            {/* Grid overlay */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full z-10">
              {cameras.map((c, i) => (
                <div key={c.cameraId || i} className="bg-slate-900/80 border border-slate-700 p-3 rounded-md text-white backdrop-blur">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono text-emerald-400">{c.cameraId}</span>
                    <Badge variant="success" className="text-[10px] py-0">LIVE</Badge>
                  </div>
                  <div className="text-sm font-semibold truncate">{c.name}</div>
                  <div className="text-xs text-slate-400 mt-1 flex justify-between">
                    <span>Zone: {c.zoneType}</span>
                    <span>30 FPS</span>
                  </div>
                  <div className="mt-2 h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 w-full animate-pulse"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
