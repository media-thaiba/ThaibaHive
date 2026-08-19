'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { IndianRupee } from 'lucide-react';
import { MetricGauge, AreaTrendChart } from './analytics-charts';

interface PrincipalFeeData {
  feeCollectedToday?: number;
  pendingApprovals?: number;
  incidentsPending?: number;
}

export function PrincipalFeeRecovery({ data: initialData }: { data?: PrincipalFeeData }) {
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/analytics?type=finance')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch finance analytics');
        return res.json();
      })
      .then((json) => {
        if (json.data) {
          setAnalytics(json.data);
        }
      })
      .catch((err) => {
        console.error('[PrincipalFeeRecovery] Fetch error:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const collectedToday = initialData?.feeCollectedToday ?? 0;
  const efficiency = analytics ? analytics.collectionEfficiency : 100;
  
  const chartData = analytics?.dailyCollections?.map((c: any) => ({
    label: c.date,
    value: c.amount
  })) || [];

  return (
    <Card data-testid="widget-principal-fee-recovery" role="region" aria-label="Fee Recovery Summary">
      <CardHeader>
        <div className="flex items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Fee Recovery & Efficiency</CardTitle>
          <IndianRupee className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col items-center justify-center">
            <MetricGauge value={efficiency} title="Realization Efficiency" loading={loading} />
            <span className="text-xs text-muted-foreground mt-2">Today: ₹{collectedToday.toLocaleString('en-IN')}</span>
          </div>
          <div className="h-[200px]">
            <span className="text-xs font-semibold text-slate-500 mb-2 block">Collections Trend</span>
            <AreaTrendChart data={chartData} title="Fee Collections" loading={loading} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
