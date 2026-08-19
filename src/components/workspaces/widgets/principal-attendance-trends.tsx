'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users } from 'lucide-react';
import { MetricGauge, ComparativeBarChart } from './analytics-charts';

interface PrincipalData {
  staffTotal?: number;
  presentToday?: number;
  absentToday?: number;
  lateToday?: number;
}

export function PrincipalAttendanceTrends({ data: initialData }: { data?: PrincipalData }) {
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/analytics?type=attendance')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch attendance analytics');
        return res.json();
      })
      .then((json) => {
        if (json.data) {
          setAnalytics(json.data);
        }
      })
      .catch((err) => {
        console.error('[PrincipalAttendanceTrends] Fetch error:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const staffTotal = initialData?.staffTotal ?? 0;
  const present = initialData?.presentToday ?? 0;
  const rate = staffTotal > 0 ? Math.round((present / staffTotal) * 100) : 0;

  const currentRate = analytics ? analytics.rate : rate;
  const chartData = analytics?.departmentVariations?.map((d: any) => ({
    category: d.departmentName,
    value: d.rate
  })) || [];

  return (
    <Card data-testid="widget-principal-attendance-trends" role="region" aria-label="Staff Attendance Trends">
      <CardHeader>
        <div className="flex items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Staff Attendance & Trends</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col items-center justify-center">
            <MetricGauge value={currentRate} title="Presence Rate" loading={loading} />
          </div>
          <div className="h-[200px]">
            <span className="text-xs font-semibold text-slate-500 mb-2 block">Presence by Department</span>
            <ComparativeBarChart data={chartData} title="Department Variations" loading={loading} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
