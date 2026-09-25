'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CloudSpotQuote } from '@/lib/operations/neuro/cloud/cloud-types';

interface SpotArbitragePanelProps {
  quotes: CloudSpotQuote[];
  onTriggerBurst?: (quote: CloudSpotQuote) => void;
}

export const SpotArbitragePanel: React.FC<SpotArbitragePanelProps> = ({
  quotes,
  onTriggerBurst,
}) => {
  return (
    <Card className="border border-border/60 bg-card/90 shadow-sm">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-sm font-semibold">Real-Time Cloud Spot Arbitrage Matrix</CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            Live spot instances across AWS, GCP, RunPod & On-Premise with auto-migration resilience
          </p>
        </div>
        <Badge variant="info" className="text-xs">
          Multi-Cloud Broker
        </Badge>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="text-muted-foreground border-b border-border/60">
              <tr>
                <th className="py-2 px-3 font-medium">Provider</th>
                <th className="py-2 px-3 font-medium">Region</th>
                <th className="py-2 px-3 font-medium">GPU Config</th>
                <th className="py-2 px-3 font-medium">Spot Rate</th>
                <th className="py-2 px-3 font-medium">On-Demand Rate</th>
                <th className="py-2 px-3 font-medium">Savings</th>
                <th className="py-2 px-3 font-medium">Risk Score</th>
                <th className="py-2 px-3 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {quotes.map((q, idx) => (
                <tr key={idx} className="hover:bg-muted/30 transition-colors">
                  <td className="py-2.5 px-3 font-bold uppercase">{q.provider.toUpperCase()}</td>
                  <td className="py-2.5 px-3 text-muted-foreground font-mono">{q.region}</td>
                  <td className="py-2.5 px-3 font-mono">{q.instanceType}</td>
                  <td className="py-2.5 px-3 font-semibold text-emerald-600 dark:text-emerald-400 font-mono">
                    {`$${q.spotPriceUsdPerHour.toFixed(2)}/hr`}
                  </td>
                  <td className="py-2.5 px-3 text-muted-foreground font-mono">
                    {`$${q.onDemandPriceUsdPerHour.toFixed(2)}/hr`}
                  </td>
                  <td className="py-2.5 px-3">
                    {q.savingsPercent > 0 ? (
                      <Badge variant="success" className="text-[10px]">
                        {`-${q.savingsPercent.toFixed(0)}%`}
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-[10px]">Baseline</Badge>
                    )}
                  </td>
                  <td className="py-2.5 px-3 font-mono">
                    {(q.interruptionRiskScore * 100).toFixed(0)}%
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <button
                      onClick={() => onTriggerBurst?.(q)}
                      className="px-2.5 py-1 text-[11px] font-medium bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors cursor-pointer"
                    >
                      Burst
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};
