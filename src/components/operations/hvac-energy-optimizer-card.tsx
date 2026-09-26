'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Zap, Thermometer } from 'lucide-react';

interface HvacEnergyOptimizerCardProps {
  optimizations: any[];
  summary: { totalSavedKwh: number; totalCostSavedDollars: number };
  isLoading: boolean;
  onOptimizeTrigger?: () => void;
}

export function HvacEnergyOptimizerCard({
  optimizations,
  summary,
  isLoading,
  onOptimizeTrigger,
}: HvacEnergyOptimizerCardProps) {
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
          <Zap className="h-5 w-5 text-amber-400" />
          <CardTitle className="text-base font-semibold text-slate-100">
            Autonomous HVAC & Energy Grid
          </CardTitle>
        </div>
        <Badge variant="success">ISO 7730 Compliant</Badge>
      </CardHeader>

      <CardContent className="space-y-4 pt-2">
        <div className="grid grid-cols-2 gap-3 rounded-lg border border-slate-800/80 bg-slate-900/50 p-3">
          <div>
            <div className="text-xs text-slate-400">Total Energy Saved</div>
            <div className="text-xl font-bold text-emerald-400">
              {summary.totalSavedKwh.toFixed(1)} <span className="text-xs text-slate-400">kWh</span>
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-400">Projected Cost Savings</div>
            <div className="text-xl font-bold text-sky-400">
              ${summary.totalCostSavedDollars.toFixed(2)}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Active Zone Optimizations ({optimizations.length})</span>
            {onOptimizeTrigger && (
              <Button size="sm" variant="outline" onClick={onOptimizeTrigger} className="h-7 text-xs">
                Trigger Run
              </Button>
            )}
          </div>

          <div className="max-h-48 space-y-2 overflow-y-auto pr-1">
            {optimizations.length === 0 ? (
              <div className="rounded border border-dashed border-slate-800 p-4 text-center text-xs text-slate-500">
                All zones operating within optimal thermal comfort setpoints.
              </div>
            ) : (
              optimizations.map((opt, idx) => (
                <div
                  key={opt.id || idx}
                  className="flex items-center justify-between rounded-md border border-slate-800 bg-slate-900/30 p-2 text-xs"
                >
                  <div className="flex items-center space-x-2">
                    <Thermometer className="h-4 w-4 text-slate-400" />
                    <div>
                      <div className="font-medium text-slate-200">{opt.zoneId || 'Zone'}</div>
                      <div className="text-[10px] text-slate-400">
                        {opt.baselineTempCelsius}°C → {opt.optimizedSetpointCelsius}°C (Δ{opt.deltaCelsius}°C)
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="info" className="text-[10px]">
                      +{opt.projectedKwhSavings || 0} kWh
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
