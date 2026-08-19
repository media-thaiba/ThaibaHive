'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen } from 'lucide-react';
import { MetricGauge, ComparativeBarChart } from './analytics-charts';

interface TeacherData {
  classCount?: number;
  attendancePending?: number;
}

export function TeacherClassAttendance({ data: initialData }: { data?: TeacherData }) {
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/analytics?type=academics')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch academics analytics');
        return res.json();
      })
      .then((json) => {
        if (json.data) {
          setAnalytics(json.data);
        }
      })
      .catch((err) => {
        console.error('[TeacherClassAttendance] Fetch error:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const totalClasses = initialData?.classCount ?? 0;
  const passRate = analytics ? analytics.passRate : 100;
  
  const chartData = analytics?.classPerformance?.map((c: any) => ({
    category: c.className,
    value: c.passRate // Using passRate per class for comparison
  })) || [];

  return (
    <Card data-testid="widget-teacher-class-attendance" role="region" aria-label="Class Attendance">
      <CardHeader>
        <div className="flex items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Class Academic Performance</CardTitle>
          <BookOpen className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col items-center justify-center">
            <MetricGauge value={passRate} title="Overall Pass Rate" loading={loading} />
            <span className="text-xs text-muted-foreground mt-2">Today: {totalClasses} classes scheduled</span>
          </div>
          <div className="h-[200px]">
            <span className="text-xs font-semibold text-slate-500 mb-2 block">Class Pass Rates Comparison</span>
            <ComparativeBarChart data={chartData} title="Class Performance" loading={loading} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
