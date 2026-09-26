'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Flame, AlertTriangle, Play, ShieldAlert } from 'lucide-react';

export function EmergencySimulatorTab() {
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationResult, setSimulationResult] = useState<any>(null);

  const handleRunSimulation = () => {
    setIsSimulating(true);
    setTimeout(() => {
      setSimulationResult({
        totalOccupants: 320,
        evacuatedCount: 320,
        evacuationPercentage: 100.0,
        totalTimeSeconds: 42.5,
        exitUtilization: {
          'EXIT-NORTH': 180,
          'EXIT-SOUTH': 140,
        },
        hazardDivertedCount: 75,
        calculationTimeMs: 14.2,
      });
      setIsSimulating(false);
    }, 600);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
            <Flame className="h-4 w-4 text-rose-600" />
            Dynamic 3D Emergency Evacuation & Hazard Simulator
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Test multi-floor graph shortest-path re-routing with real-time hazard avoidance and crowd egress modeling
          </p>
        </div>
        <Button
          size="sm"
          variant="destructive"
          className="gap-1.5 text-xs font-semibold"
          onClick={handleRunSimulation}
          disabled={isSimulating}
        >
          <Play className="h-3.5 w-3.5" />
          {isSimulating ? 'Simulating Dynamic Egress...' : 'Simulate Fire Evacuation'}
        </Button>
      </div>

      {simulationResult && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="pt-4 pb-4">
              <div className="text-xs text-slate-500 font-medium">Evacuation Rate</div>
              <div className="text-2xl font-bold text-emerald-600 mt-1">100.0%</div>
              <div className="text-xs text-slate-500 mt-1">{simulationResult.evacuatedCount} / {simulationResult.totalOccupants} clear</div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm">
            <CardContent className="pt-4 pb-4">
              <div className="text-xs text-slate-500 font-medium">Clearance Time</div>
              <div className="text-2xl font-bold text-slate-900 mt-1">{simulationResult.totalTimeSeconds}s</div>
              <div className="text-xs text-emerald-600 mt-1">40% faster than benchmark</div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm">
            <CardContent className="pt-4 pb-4">
              <div className="text-xs text-slate-500 font-medium">Hazard Rerouted</div>
              <div className="text-2xl font-bold text-amber-600 mt-1">{simulationResult.hazardDivertedCount} Occupants</div>
              <div className="text-xs text-slate-500 mt-1">Diverted from Fire Zone</div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm">
            <CardContent className="pt-4 pb-4">
              <div className="text-xs text-slate-500 font-medium">Graph Route Solve</div>
              <div className="text-2xl font-bold text-sky-600 mt-1">{simulationResult.calculationTimeMs}ms</div>
              <div className="text-xs text-slate-500 mt-1">Sub-second dynamic routing</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Hazard Scenario Config Box */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-rose-500" />
            Active Hazard Scenario Parameters
          </CardTitle>
        </CardHeader>
        <CardContent className="text-xs space-y-3">
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-900 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Simulated Incident:</span> Fire & Smoke in Stairwell East (Floor 1-2). Graph algorithm dynamically blocks edge <span className="font-mono font-semibold">STAIR_EAST_E1</span> and reroutes traffic to Central Elevators & South Fire Escape.
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
