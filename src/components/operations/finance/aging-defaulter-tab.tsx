'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CampusAgingSummary } from '@/lib/operations/finance/aging/aging-analytics-engine';

interface AgingDefaulterTabProps {
  summary: CampusAgingSummary | null;
}

export function AgingDefaulterTab({ summary }: AgingDefaulterTabProps) {
  if (!summary) {
    return (
      <Card className="border border-slate-200 shadow-sm p-8 text-center text-slate-500 text-sm">
        Aging accounts receivable data not calculated yet.
      </Card>
    );
  }

  const buckets = [
    { label: 'Current (Not Due)', amount: summary.currentNotDue, color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    { label: '1 – 30 Days Overdue', amount: summary.bucket1_30, color: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
    { label: '31 – 60 Days Overdue', amount: summary.bucket31_60, color: 'bg-amber-50 text-amber-700 border-amber-200' },
    { label: '61 – 90 Days (Exam Hold)', amount: summary.bucket61_90, color: 'bg-orange-50 text-orange-700 border-orange-200' },
    { label: '90+ Days (Critical Default)', amount: summary.bucket90_plus, color: 'bg-red-50 text-red-700 border-red-200' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border border-slate-200 shadow-sm p-4">
          <div className="text-xs text-slate-500 font-medium">Total Accounts Receivable</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">₹{summary.totalReceivable.toLocaleString('en-IN')}</div>
        </Card>
        <Card className="border border-slate-200 shadow-sm p-4">
          <div className="text-xs text-slate-500 font-medium">Overdue Dues Total</div>
          <div className="text-2xl font-bold text-rose-600 mt-1">₹{summary.totalOverdue.toLocaleString('en-IN')}</div>
        </Card>
        <Card className="border border-slate-200 shadow-sm p-4">
          <div className="text-xs text-slate-500 font-medium">Collection Recovery Rate</div>
          <div className="text-2xl font-bold text-emerald-600 mt-1">{summary.collectionRatePercent}%</div>
        </Card>
        <Card className="border border-slate-200 shadow-sm p-4">
          <div className="text-xs text-slate-500 font-medium">Critical Defaulters (90+ Days)</div>
          <div className="text-2xl font-bold text-red-700 mt-1">{summary.criticalDefaulterCount} Students</div>
        </Card>
      </div>

      <Card className="border border-slate-200 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <div>
            <CardTitle className="text-lg font-bold text-slate-900">Aging Accounts Receivable Matrix</CardTitle>
            <p className="text-xs text-slate-500 mt-1">30/60/90 days delinquency breakdown with automated recovery policies</p>
          </div>
          <Badge variant="warning">
            {summary.defaulterStudentCount} Total Defaulters
          </Badge>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {buckets.map((b, idx) => (
              <div key={idx} className={`p-4 rounded-lg border ${b.color}`}>
                <div className="text-xs font-semibold uppercase">{b.label}</div>
                <div className="text-lg font-bold mt-2">₹{b.amount.toLocaleString('en-IN')}</div>
                <div className="text-[11px] opacity-80 mt-1">
                  {summary.totalReceivable > 0
                    ? `${Math.round((b.amount / summary.totalReceivable) * 100)}% of total dues`
                    : '0%'}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
