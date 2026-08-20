'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, ShieldCheck, Cpu, Zap, Truck, Leaf } from 'lucide-react';

interface SmartCampusRadarProps {
  energySavingsKwh: number;
  activeDispatches: number;
  biometricPunches: number;
  cloudSavingsDollars: number;
  renewableEnergyRatio: number;
}

export function SmartCampusRadar({
  energySavingsKwh,
  activeDispatches,
  biometricPunches,
  cloudSavingsDollars,
  renewableEnergyRatio,
}: SmartCampusRadarProps) {
  return (
    <Card className="border-slate-800 bg-slate-950/80 shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center space-x-2">
          <Activity className="h-5 w-5 text-emerald-400" />
          <CardTitle className="text-lg font-bold text-slate-100">
            AIMS Smart Campus Autonomous Operations Radar
          </CardTitle>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="success">All Systems Autonomous</Badge>
          <Badge variant="info">MARL Decentralized Policy Active</Badge>
        </div>
      </CardHeader>

      <CardContent className="pt-2">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
          <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3">
            <div className="flex items-center space-x-1.5 text-xs text-slate-400">
              <Zap className="h-4 w-4 text-amber-400" />
              <span>Energy Saved</span>
            </div>
            <div className="mt-1 text-2xl font-bold text-amber-400">{energySavingsKwh.toFixed(1)} kWh</div>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3">
            <div className="flex items-center space-x-1.5 text-xs text-slate-400">
              <Truck className="h-4 w-4 text-indigo-400" />
              <span>Active Dispatches</span>
            </div>
            <div className="mt-1 text-2xl font-bold text-indigo-400">{activeDispatches}</div>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3">
            <div className="flex items-center space-x-1.5 text-xs text-slate-400">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <span>ZKP Punches</span>
            </div>
            <div className="mt-1 text-2xl font-bold text-emerald-400">{biometricPunches}</div>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3">
            <div className="flex items-center space-x-1.5 text-xs text-slate-400">
              <Cpu className="h-4 w-4 text-sky-400" />
              <span>Cloud Savings</span>
            </div>
            <div className="mt-1 text-2xl font-bold text-sky-400">${cloudSavingsDollars.toFixed(0)}/mo</div>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3">
            <div className="flex items-center space-x-1.5 text-xs text-slate-400">
              <Leaf className="h-4 w-4 text-emerald-400" />
              <span>Renewable Energy</span>
            </div>
            <div className="mt-1 text-2xl font-bold text-emerald-400">{renewableEnergyRatio}%</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
