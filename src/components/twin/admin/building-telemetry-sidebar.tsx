'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ParsedSpaceModel } from '@/lib/operations/twin/rendering/model-parser';
import { Activity, Thermometer, Wind, Zap, ShieldCheck } from 'lucide-react';

interface BuildingTelemetrySidebarProps {
  selectedSpace: ParsedSpaceModel | null;
  facilityName: string;
}

export function BuildingTelemetrySidebar({ selectedSpace, facilityName }: BuildingTelemetrySidebarProps) {
  return (
    <div className="space-y-4">
      {/* Overall Facility Telemetry Summary */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
              <Activity className="h-4 w-4 text-sky-600" />
              {facilityName} Radar
            </CardTitle>
            <Badge variant="success">Nominal</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 text-xs">
          <div>
            <div className="flex justify-between text-slate-600 mb-1 font-medium">
              <span>Average Comfort Index</span>
              <span className="font-bold text-emerald-600">92 / 100</span>
            </div>
            <Progress value={92} className="h-1.5" />
          </div>

          <div>
            <div className="flex justify-between text-slate-600 mb-1 font-medium">
              <span>Real-Time Space Utilization</span>
              <span className="font-bold text-sky-600">68%</span>
            </div>
            <Progress value={68} className="h-1.5" />
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
            <div className="bg-slate-50 p-2 rounded border border-slate-100">
              <div className="text-slate-500 flex items-center gap-1">
                <Thermometer className="h-3.5 w-3.5 text-amber-500" /> Avg Temp
              </div>
              <div className="text-base font-bold text-slate-800 mt-0.5">22.4°C</div>
            </div>

            <div className="bg-slate-50 p-2 rounded border border-slate-100">
              <div className="text-slate-500 flex items-center gap-1">
                <Wind className="h-3.5 w-3.5 text-teal-500" /> Air Quality
              </div>
              <div className="text-base font-bold text-slate-800 mt-0.5">485 ppm</div>
            </div>

            <div className="bg-slate-50 p-2 rounded border border-slate-100">
              <div className="text-slate-500 flex items-center gap-1">
                <Zap className="h-3.5 w-3.5 text-amber-500" /> Energy Load
              </div>
              <div className="text-base font-bold text-slate-800 mt-0.5">42.8 kW</div>
            </div>

            <div className="bg-slate-50 p-2 rounded border border-slate-100">
              <div className="text-slate-500 flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5 text-indigo-500" /> Active RTLS
              </div>
              <div className="text-base font-bold text-slate-800 mt-0.5">128 Assets</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Selected Space Deep-Dive Card */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Selected Space Inspector
          </CardTitle>
        </CardHeader>
        <CardContent className="text-xs">
          {selectedSpace ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-slate-900">{selectedSpace.name}</span>
                <Badge variant="info">Floor {selectedSpace.floorLevel}</Badge>
              </div>
              <div className="text-slate-600">Code: <span className="font-medium text-slate-800">{selectedSpace.code}</span></div>
              <div className="text-slate-600">Type: <span className="font-medium capitalize text-slate-800">{selectedSpace.spaceType}</span></div>
              <div className="text-slate-600">Capacity: <span className="font-medium text-slate-800">{selectedSpace.capacity} persons</span></div>
              <div className="text-slate-600">Surface Area: <span className="font-medium text-slate-800">{selectedSpace.meshLod0.surfaceAreaSqMeters} m²</span></div>
              <div className="text-slate-600">Enclosed Volume: <span className="font-medium text-slate-800">{selectedSpace.meshLod0.volumeCuMeters} m³</span></div>
            </div>
          ) : (
            <p className="text-slate-400 italic">Click on any 3D room to inspect spatial geometry and live telemetry.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
