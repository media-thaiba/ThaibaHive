'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useEngageAnalytics } from '@/lib/hooks/engage/use-engage-analytics';

export function AnalyticsDashboardPanel() {
  const { overview, loading, error } = useEngageAnalytics();

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (error || !overview) {
    return (
      <Card>
        <CardContent className="p-6 text-destructive">
          Error loading analytics: {error || 'No overview available'}
        </CardContent>
      </Card>
    );
  }

  const funnel = overview.funnel || {
    dispatched: 0,
    delivered: 0,
    opened: 0,
    clicked: 0,
    responded: 0,
    deliveryRate: 1.0,
    openRate: 0.0,
    ctr: 0.0,
  };

  const channelBreakdown = overview.channelBreakdown || [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center justify-between">
            <span>Stakeholder Engagement & Channel Performance Analytics</span>
            <Badge variant="info">Real-time Telemetry</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="p-4 bg-muted rounded-lg text-center">
              <p className="text-xs text-muted-foreground uppercase">Dispatched</p>
              <p className="text-2xl font-bold">{funnel.dispatched}</p>
            </div>
            <div className="p-4 bg-muted rounded-lg text-center">
              <p className="text-xs text-muted-foreground uppercase">Delivery Rate</p>
              <p className="text-2xl font-bold text-emerald-600">{(funnel.deliveryRate * 100).toFixed(1)}%</p>
            </div>
            <div className="p-4 bg-muted rounded-lg text-center">
              <p className="text-xs text-muted-foreground uppercase">Open Rate</p>
              <p className="text-2xl font-bold text-blue-600">{(funnel.openRate * 100).toFixed(1)}%</p>
            </div>
            <div className="p-4 bg-muted rounded-lg text-center">
              <p className="text-xs text-muted-foreground uppercase">Click-Through Rate</p>
              <p className="text-2xl font-bold text-purple-600">{(funnel.ctr * 100).toFixed(1)}%</p>
            </div>
          </div>

          <h3 className="font-semibold text-sm mb-3">Channel Efficacy & Unit Cost Breakdown</h3>
          <div className="border rounded-md overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted text-muted-foreground font-medium border-b">
                <tr>
                  <th className="p-3">Channel</th>
                  <th className="p-3">Volume</th>
                  <th className="p-3">Delivery Rate</th>
                  <th className="p-3">Open Rate</th>
                  <th className="p-3">Total Spend (USD)</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {channelBreakdown.map((ch: any) => (
                  <tr key={ch.channel} className="hover:bg-muted/50">
                    <td className="p-3 font-semibold uppercase">{ch.channel}</td>
                    <td className="p-3">{ch.volume}</td>
                    <td className="p-3">{(ch.deliveryRate * 100).toFixed(1)}%</td>
                    <td className="p-3">{(ch.openRate * 100).toFixed(1)}%</td>
                    <td className="p-3 font-mono">${ch.totalCostUsd.toFixed(4)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
