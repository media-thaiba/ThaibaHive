import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface EnergyLoadTabProps {
  onExecutePeakShave?: (setbackDegrees: number) => Promise<any>;
}

export function EnergyLoadTab({ onExecutePeakShave }: EnergyLoadTabProps) {
  const [loadShedResult, setLoadShedResult] = useState<any>(null);
  const [isExecuting, setIsExecuting] = useState(false);

  const handleTrigger = async () => {
    if (!onExecutePeakShave) return;
    setIsExecuting(true);
    try {
      const res = await onExecutePeakShave(1.5);
      setLoadShedResult(res);
    } catch {}
    setIsExecuting(false);
  };

  return (
    <div className="space-y-6">
      {/* ECO-MESH Peak Tariff Synergy Card */}
      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle className="text-base font-semibold">ECO-MESH Peak Tariff Demand Response</CardTitle>
            <div className="text-xs text-muted-foreground mt-0.5">
              Automated chiller and AHU setpoint setback shedding peak power load during high-tariff grid events
            </div>
          </div>
          <Button size="sm" disabled={isExecuting} onClick={handleTrigger}>
            {isExecuting ? 'Executing...' : 'Trigger +1.5°C Load Shed'}
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-3 bg-muted/40 rounded border space-y-1">
              <div className="text-xs text-muted-foreground">Grid Tariff Status</div>
              <div className="text-lg font-bold text-amber-500">Peak Hour Active</div>
              <div className="text-xs text-muted-foreground">$0.45 / kWh base rate</div>
            </div>
            <div className="p-3 bg-muted/40 rounded border space-y-1">
              <div className="text-xs text-muted-foreground">Active Curtailment</div>
              <div className="text-lg font-bold font-mono text-primary">
                {loadShedResult ? `${loadShedResult.totalPowerCurtailmentKw} kW` : '0.0 kW'}
              </div>
              <div className="text-xs text-muted-foreground">HVAC load shed active</div>
            </div>
            <div className="p-3 bg-muted/40 rounded border space-y-1">
              <div className="text-xs text-muted-foreground">Critical Exemptions</div>
              <div className="text-lg font-bold text-emerald-500">2 Cleanrooms</div>
              <div className="text-xs text-muted-foreground">ISO-7 Research zones protected</div>
            </div>
          </div>

          {loadShedResult && (
            <div className="p-3 bg-primary/5 border border-primary/20 rounded text-xs space-y-2">
              <div className="font-semibold text-foreground flex items-center justify-between">
                <span>Demand Response Execution Summary</span>
                <Badge variant="success">Executed</Badge>
              </div>
              <div className="text-muted-foreground">
                Total power curtailed: <span className="font-bold text-foreground">{loadShedResult.totalPowerCurtailmentKw} kW</span> across {loadShedResult.facilitiesShedded.length} equipment units.
              </div>
              <div className="text-muted-foreground">
                Exemptions honored: {loadShedResult.exemptionsHonored.join(', ')}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
