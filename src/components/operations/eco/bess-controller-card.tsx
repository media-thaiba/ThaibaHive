'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Battery, ShieldCheck, Zap, Activity } from 'lucide-react';
import { BatteryDispatchMode } from '@/lib/operations/eco/eco-types';

export interface BessControllerCardProps {
  batteryId?: string;
  nominalCapacityKwh?: number;
  initialSoC?: number;
}

export function BessControllerCard({
  batteryId = 'bess_unit_01',
  nominalCapacityKwh = 500,
  initialSoC = 78,
}: BessControllerCardProps) {
  const [mode, setMode] = useState<BatteryDispatchMode>('arbitrage');
  const [soc, setSoc] = useState<number>(initialSoC);
  const [powerKw, setPowerKw] = useState<number>(120);

  const handleModeChange = (newMode: BatteryDispatchMode) => {
    setMode(newMode);
    if (newMode === 'emergency_reserve') {
      setPowerKw(0);
    } else if (newMode === 'peak_shaving') {
      setPowerKw(180);
    } else {
      setPowerKw(120);
    }
  };

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
            <Battery className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-base font-semibold">BESS Autonomous Dispatch Controller</CardTitle>
            <p className="text-xs text-slate-500 font-mono">{batteryId} &bull; {nominalCapacityKwh} kWh LFP</p>
          </div>
        </div>
        <Badge variant={mode === 'emergency_reserve' ? 'warning' : 'success'}>
          Mode: {mode.replace('_', ' ').toUpperCase()}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* SoC progress visualization */}
        <div>
          <div className="flex justify-between items-center text-sm mb-1.5">
            <span className="text-slate-600 font-medium">State of Charge (SoC)</span>
            <span className="font-bold text-slate-900">{soc}% ({((soc / 100) * nominalCapacityKwh).toFixed(0)} kWh)</span>
          </div>
          <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                soc < 25 ? 'bg-rose-500' : soc < 50 ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${soc}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-mono">
            <span>20% Reserve Floor</span>
            <span>50% Mid</span>
            <span>90% Max Bound</span>
          </div>
        </div>

        {/* Operating telemetry */}
        <div className="grid grid-cols-3 gap-3 p-3 bg-slate-50 rounded-lg text-center">
          <div>
            <div className="text-xs text-slate-500">Dispatch Flow</div>
            <div className="text-sm font-bold text-slate-900 flex items-center justify-center gap-0.5 mt-0.5">
              <Zap className="h-3.5 w-3.5 text-amber-500" />
              {powerKw} kW
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500">Health (SOH)</div>
            <div className="text-sm font-bold text-emerald-600 flex items-center justify-center gap-0.5 mt-0.5">
              <ShieldCheck className="h-3.5 w-3.5" />
              98.8%
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500">Cell Temp</div>
            <div className="text-sm font-bold text-slate-900 flex items-center justify-center gap-0.5 mt-0.5">
              <Activity className="h-3.5 w-3.5 text-blue-500" />
              24.6°C
            </div>
          </div>
        </div>

        {/* Dispatch Mode Selector Buttons */}
        <div>
          <label className="text-xs font-semibold text-slate-700 block mb-2">Autonomous Control Strategy</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Button
              variant={mode === 'arbitrage' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleModeChange('arbitrage')}
              className="text-xs"
            >
              TOU Arbitrage
            </Button>
            <Button
              variant={mode === 'peak_shaving' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleModeChange('peak_shaving')}
              className="text-xs"
            >
              Peak Shaving
            </Button>
            <Button
              variant={mode === 'emergency_reserve' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleModeChange('emergency_reserve')}
              className="text-xs"
            >
              Reserve Hold
            </Button>
            <Button
              variant={mode === 'grid_forming' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleModeChange('grid_forming')}
              className="text-xs"
            >
              Grid Forming
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
