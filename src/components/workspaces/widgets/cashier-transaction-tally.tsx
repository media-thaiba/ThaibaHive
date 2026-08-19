'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Receipt } from 'lucide-react';
import { AreaTrendChart } from './analytics-charts';

interface CashierData {
  collectionTotal?: number;
  dailyCheckouts?: number;
}

export function CashierTransactionTally({ data: initialData }: { data?: CashierData }) {
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
        console.error('[CashierTransactionTally] Fetch error:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const total = initialData?.collectionTotal ?? analytics?.collectionTotal ?? 0;
  const checkouts = initialData?.dailyCheckouts ?? (analytics?.dailyCollections ? analytics.dailyCollections.reduce((acc: number, c: any) => acc + (c.amount > 0 ? 1 : 0), 0) : 0);

  const chartData = analytics?.dailyCollections?.map((c: any) => ({
    label: c.date,
    value: c.amount
  })) || [];

  return (
    <Card data-testid="widget-cashier-transaction-tally" role="region" aria-label="Transaction Tally">
      <CardHeader>
        <div className="flex items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Today&apos;s Collections</CardTitle>
          <Receipt className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col justify-center">
            <div className="text-2xl font-bold">₹{total.toLocaleString('en-IN')}</div>
            <p className="text-xs text-muted-foreground mt-1">{checkouts} transactions processed</p>
            {total === 0 && !loading && (
              <p className="text-xs text-muted-foreground mt-2">No collections recorded today.</p>
            )}
          </div>
          <div className="h-[120px]">
            <span className="text-xs font-semibold text-slate-500 mb-1 block">Cashier Flow Lines</span>
            <AreaTrendChart data={chartData} title="Cashier Flow" loading={loading} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
