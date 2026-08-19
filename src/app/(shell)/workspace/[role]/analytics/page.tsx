'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';

const AreaTrendChart = dynamic(
  () => import('@/components/workspaces/widgets/analytics-charts').then((m) => m.AreaTrendChart),
  {
    ssr: false,
    loading: () => <Skeleton className="h-[300px] w-full" />,
  }
);

const ComparativeBarChart = dynamic(
  () => import('@/components/workspaces/widgets/analytics-charts').then((m) => m.ComparativeBarChart),
  {
    ssr: false,
    loading: () => <Skeleton className="h-[300px] w-full" />,
  }
);

const MetricGauge = dynamic(
  () => import('@/components/workspaces/widgets/analytics-charts').then((m) => m.MetricGauge),
  {
    ssr: false,
    loading: () => <Skeleton className="h-[150px] w-full" />,
  }
);

const PerformanceRadarChart = dynamic(
  () => import('@/components/workspaces/widgets/analytics-charts').then((m) => m.PerformanceRadarChart),
  {
    ssr: false,
    loading: () => <Skeleton className="h-[300px] w-full" />,
  }
);

import { ShieldAlert, Calendar, Building, BarChart2, Filter, Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ReportBuilder } from '@/components/reports/report-builder';

export default function WorkspaceAnalyticsPage() {
  const params = useParams();
  const router = useRouter();
  const { staff, isLoading: authLoading } = useAuth();
  const roleParam = typeof params.role === 'string' ? params.role : '';

  const [activeTab, setActiveTab] = useState<'attendance' | 'finance' | 'academics' | 'usage' | 'predictive' | 'reports'>('attendance');
  
  // Filter States (initialized from localStorage if available)
  const [startDate, setStartDate] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('bi_filter_start_date') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    }
    return new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  });

  const [endDate, setEndDate] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('bi_filter_end_date') || new Date().toISOString().split('T')[0];
    }
    return new Date().toISOString().split('T')[0];
  });

  const [institutionId, setInstitutionId] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('bi_filter_institution_id') || '';
    }
    return '';
  });

  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Set default tabs based on role
  useEffect(() => {
    if (roleParam === 'principal') {
      setActiveTab('attendance');
    } else if (roleParam === 'cashier') {
      setActiveTab('finance');
    } else if (roleParam === 'teacher') {
      setActiveTab('academics');
    } else {
      setActiveTab('usage');
    }
  }, [roleParam]);

  // Persist filter changes to localStorage
  useEffect(() => {
    localStorage.setItem('bi_filter_start_date', startDate);
    localStorage.setItem('bi_filter_end_date', endDate);
    if (institutionId) {
      localStorage.setItem('bi_filter_institution_id', institutionId);
    }
  }, [startDate, endDate, institutionId]);

  // Fetch analytics data
  useEffect(() => {
    if (authLoading || !staff) return;

    if (activeTab === 'reports') {
      setLoading(false);
      return;
    }

    setLoading(true);
    setAnalyticsData(null);
    setError(null);

    const query = new URLSearchParams();
    query.append('type', activeTab);
    query.append('startDate', startDate);
    query.append('endDate', endDate);
    if (institutionId) {
      query.append('institutionId', institutionId);
    }

    fetch(`/api/analytics?${query.toString()}`)
      .then((res) => {
        if (!res.ok) {
          if (res.status === 403) throw new Error('Forbidden: You do not have permissions for this analytics section.');
          throw new Error('Failed to retrieve analytics data.');
        }
        return res.json();
      })
      .then((json) => {
        setAnalyticsData(json.data);
      })
      .catch((err: any) => {
        setError(err.message || String(err));
      })
      .finally(() => {
        setLoading(false);
      });
  }, [activeTab, startDate, endDate, institutionId, authLoading, staff]);

  // Document Title
  useEffect(() => {
    document.title = "Executive Business Intelligence Dashboard | ThaibaHive";
  }, []);

  if (authLoading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!staff) {
    return (
      <div className="flex h-[80vh] items-center justify-center p-6">
        <Card className="max-w-md w-full text-center">
          <CardHeader>
            <ShieldAlert className="mx-auto h-10 w-10 text-destructive mb-2" />
            <CardTitle>Session Expired</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">Please log in to view executive analytics.</p>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const isAuthorized = ['super_admin', 'admin', 'principal', 'hod', 'accounts', 'purchase'].includes(staff.role);
  if (!isAuthorized) {
    return (
      <div className="flex h-[80vh] items-center justify-center p-6">
        <Card className="max-w-md w-full text-center">
          <CardHeader>
            <ShieldAlert className="mx-auto h-10 w-10 text-destructive mb-2" />
            <CardTitle>Access Denied</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">BI Analytics is reserved for Executive roles.</p>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-7xl">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
        <div>
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm" onClick={() => router.back()} className="mr-2">
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <Badge variant="secondary" className="px-2.5 py-0.5 text-xs font-semibold">
              v3.10.0 BI Engine
            </Badge>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight mt-1 bg-gradient-to-r from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent">
            Executive BI Dashboard
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Analyze key institutional metrics, attendance variations, financials, and predictive student risk.
          </p>
        </div>
      </div>

      {/* Filter Control Board */}
      {activeTab !== 'reports' && (
      <Card className="border border-slate-200/80 bg-white/70 dark:border-slate-800 dark:bg-slate-900/70 backdrop-blur-md shadow-sm">
        <CardHeader className="py-4 px-6 border-b border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center space-x-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
            <Filter className="h-4 w-4 text-slate-500" />
            <span>Scope Filter Control Board</span>
          </div>
        </CardHeader>
        <CardContent className="py-4 px-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 flex items-center">
                <Building className="h-3.5 w-3.5 mr-1" /> Campus ID
              </label>
              <input
                type="text"
                placeholder="All Campuses"
                value={institutionId}
                onChange={(e) => setInstitutionId(e.target.value)}
                className="w-full h-9 rounded-md border border-slate-200 bg-white px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring dark:border-slate-800 dark:bg-slate-950"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 flex items-center">
                <Calendar className="h-3.5 w-3.5 mr-1" /> Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full h-9 rounded-md border border-slate-200 bg-white px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring dark:border-slate-800 dark:bg-slate-950"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 flex items-center">
                <Calendar className="h-3.5 w-3.5 mr-1" /> End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full h-9 rounded-md border border-slate-200 bg-white px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring dark:border-slate-800 dark:bg-slate-950"
              />
            </div>
          </div>
        </CardContent>
      </Card>
      )}

      {/* Tab Navigation Menu */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 overflow-x-auto whitespace-nowrap scrollbar-none gap-2">
        {['attendance', 'finance', 'academics', 'usage', 'predictive', 'reports'].map((tab) => {
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`pb-3 px-4 font-semibold text-sm capitalize transition-all border-b-2 -mb-[2px] ${
                isActive
                  ? 'border-primary text-primary font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-100'
              }`}
            >
              {tab === 'predictive' ? '🔮 Predictive ML' : tab === 'reports' ? '📋 Custom Reports' : tab}
            </button>
          );
        })}
      </div>

      {/* Analytics Content Area */}
      {activeTab === 'reports' ? (
        <ReportBuilder />
      ) : error ? (
        <Card className="border border-destructive/20 bg-destructive/5 text-destructive p-6 rounded-lg text-center">
          <ShieldAlert className="h-8 w-8 mx-auto text-destructive mb-2" />
          <p className="font-semibold">{error}</p>
        </Card>
      ) : loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-10 w-10 animate-spin text-primary mr-3" />
          <span className="text-slate-500 font-medium">Crunching aggregates and ETL cache...</span>
        </div>
      ) : !analyticsData ? (
        <Card className="p-8 text-center border border-slate-200 dark:border-slate-800">
          <BarChart2 className="h-8 w-8 mx-auto text-slate-400 mb-2" />
          <p className="font-medium text-slate-500">No analytics data could be computed.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {activeTab === 'attendance' && (
            <>
              <Card className="col-span-1 md:col-span-1 border border-slate-200 dark:border-slate-800">
                <CardHeader>
                  <CardTitle className="text-sm">Presence Rate</CardTitle>
                  <p className="text-xs text-muted-foreground">Overall student presence rate in range</p>
                </CardHeader>
                <CardContent className="h-[240px]">
                  <MetricGauge value={analyticsData.rate} title="Student Presence" />
                </CardContent>
              </Card>

              <Card className="col-span-1 md:col-span-2 border border-slate-200 dark:border-slate-800">
                <CardHeader>
                  <CardTitle className="text-sm">Presence by Department</CardTitle>
                  <p className="text-xs text-muted-foreground">Departmental staff presence rate comparison</p>
                </CardHeader>
                <CardContent className="h-[240px]">
                  <ComparativeBarChart
                    data={analyticsData.departmentVariations?.map((d: any) => ({
                      category: d.departmentName,
                      value: d.rate
                    })) || []}
                    title="Department Presence"
                  />
                </CardContent>
              </Card>

              <Card className="col-span-1 md:col-span-3 border border-slate-200 dark:border-slate-800">
                <CardHeader>
                  <CardTitle className="text-sm">Absenteeism Peaks</CardTitle>
                  <p className="text-xs text-muted-foreground">Dates with the highest counts of absent students</p>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
                      <thead className="text-xs text-slate-700 uppercase bg-slate-50 dark:bg-slate-800 dark:text-slate-300">
                        <tr>
                          <th className="px-6 py-3">Peak Date</th>
                          <th className="px-6 py-3">Absentee count</th>
                          <th className="px-6 py-3">Severity Indicator</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analyticsData.absenteeismPeaks?.map((p: any, idx: number) => (
                          <tr key={idx} className="bg-white border-b dark:bg-slate-900 dark:border-slate-800">
                            <td className="px-6 py-4 font-semibold text-slate-950 dark:text-slate-100">{p.date}</td>
                            <td className="px-6 py-4">{p.count} students</td>
                            <td className="px-6 py-4">
                              <Badge variant={p.count > 10 ? "destructive" : "warning"}>
                                {p.count > 10 ? "Critical Peak" : "Moderate Variance"}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                        {(!analyticsData.absenteeismPeaks || analyticsData.absenteeismPeaks.length === 0) && (
                          <tr>
                            <td colSpan={3} className="px-6 py-4 text-center">No absenteeism peaks recorded.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {activeTab === 'finance' && (
            <>
              <Card className="col-span-1 md:col-span-1 border border-slate-200 dark:border-slate-800">
                <CardHeader>
                  <CardTitle className="text-sm">Realization Efficiency</CardTitle>
                  <p className="text-xs text-muted-foreground">Collection efficiency relative to expenses</p>
                </CardHeader>
                <CardContent className="h-[240px]">
                  <MetricGauge value={analyticsData.collectionEfficiency} title="Realization Efficiency" />
                </CardContent>
              </Card>

              <Card className="col-span-1 md:col-span-2 border border-slate-200 dark:border-slate-800">
                <CardHeader>
                  <CardTitle className="text-sm">Fee Collections Trend</CardTitle>
                  <p className="text-xs text-muted-foreground">Daily credited fee totals in the selected range</p>
                </CardHeader>
                <CardContent className="h-[240px]">
                  <AreaTrendChart
                    data={analyticsData.dailyCollections?.map((c: any) => ({
                      label: c.date,
                      value: c.amount
                    })) || []}
                    title="Fee Collections"
                  />
                </CardContent>
              </Card>

              <div className="col-span-1 md:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Card className="p-4 border border-slate-200 dark:border-slate-800">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Total Collections</span>
                  <span className="text-2xl font-bold text-slate-800 dark:text-slate-100 block mt-1">₹{(analyticsData.collectionTotal ?? 0).toLocaleString('en-IN')}</span>
                </Card>
                <Card className="p-4 border border-slate-200 dark:border-slate-800">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Total Expenses</span>
                  <span className="text-2xl font-bold text-slate-800 dark:text-slate-100 block mt-1">₹{(analyticsData.expenseTotal ?? 0).toLocaleString('en-IN')}</span>
                </Card>
              </div>
            </>
          )}

          {activeTab === 'academics' && (
            <>
              <Card className="col-span-1 md:col-span-1 border border-slate-200 dark:border-slate-800">
                <CardHeader>
                  <CardTitle className="text-sm">Overall Pass Rate</CardTitle>
                  <p className="text-xs text-muted-foreground">Average passed tabulation registers</p>
                </CardHeader>
                <CardContent className="h-[240px]">
                  <MetricGauge value={analyticsData.passRate} title="Pass Rate" />
                </CardContent>
              </Card>

              <Card className="col-span-1 md:col-span-2 border border-slate-200 dark:border-slate-800">
                <CardHeader>
                  <CardTitle className="text-sm">Subject Averages</CardTitle>
                  <p className="text-xs text-muted-foreground">Average exam marks obtained by subject</p>
                </CardHeader>
                <CardContent className="h-[240px]">
                  <PerformanceRadarChart
                    data={analyticsData.subjectAverages?.map((s: any) => ({
                      subject: s.subjectName,
                      score: s.averageMarks
                    })) || []}
                    title="Subject Average Marks"
                  />
                </CardContent>
              </Card>

              <Card className="col-span-1 md:col-span-3 border border-slate-200 dark:border-slate-800">
                <CardHeader>
                  <CardTitle className="text-sm">Class Performance GPA Breakdown</CardTitle>
                  <p className="text-xs text-muted-foreground">Average GPAs and Class Pass Rates</p>
                </CardHeader>
                <CardContent className="h-[240px]">
                  <ComparativeBarChart
                    data={analyticsData.classPerformance?.map((c: any) => ({
                      category: c.className,
                      value: Math.round(c.averageGpa * 20) // Normalizing GPA to 100 max
                    })) || []}
                    title="Class GPAs (Normalized)"
                  />
                </CardContent>
              </Card>
            </>
          )}

          {activeTab === 'usage' && (
            <>
              <Card className="col-span-1 md:col-span-1 border border-slate-200 dark:border-slate-800">
                <CardHeader>
                  <CardTitle className="text-sm">Personalized Workspaces</CardTitle>
                  <p className="text-xs text-muted-foreground">Number of active workspace preference files</p>
                </CardHeader>
                <CardContent className="h-[240px] flex items-center justify-center">
                  <div className="text-center">
                    <span className="text-5xl font-extrabold text-slate-800 dark:text-slate-100">{analyticsData.personalizedWorkspaceCount}</span>
                    <span className="text-xs text-slate-500 block mt-2">Custom layouts configured</span>
                  </div>
                </CardContent>
              </Card>

              <div className="col-span-1 md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
                <Card className="border border-slate-200 dark:border-slate-800 p-6 flex flex-col justify-between">
                  <div>
                    <h3 className="font-semibold text-sm">Platform Daily Active Users (DAU)</h3>
                    <p className="text-xs text-muted-foreground mt-1">Calculated active sessions in range</p>
                  </div>
                  <span className="text-4xl font-bold mt-4">{analyticsData.activeUsersCount}</span>
                </Card>

                <Card className="border border-slate-200 dark:border-slate-800 p-6 flex flex-col justify-between">
                  <div>
                    <h3 className="font-semibold text-sm">API Latency average</h3>
                    <p className="text-xs text-muted-foreground mt-1">Platform request response times</p>
                  </div>
                  <span className="text-4xl font-bold mt-4">{analyticsData.averageLatencyMs} ms</span>
                </Card>
              </div>
            </>
          )}

          {activeTab === 'predictive' && (
            <>
              <Card className="col-span-1 md:col-span-1 border border-slate-200 dark:border-slate-800">
                <CardHeader>
                  <CardTitle className="text-sm">Realization Deficit Forecast</CardTitle>
                  <p className="text-xs text-muted-foreground">90-day budget realization deficit projection</p>
                </CardHeader>
                <CardContent className="h-[240px] flex flex-col items-center justify-center">
                  <span className="text-5xl font-bold text-rose-500">{analyticsData.budgetForecast?.deficitPercent}%</span>
                  <span className="text-xs text-slate-500 mt-2 block">Deficit Projection Percentage</span>
                  <Badge variant={analyticsData.budgetForecast?.riskLevel === "critical_deficit" ? "destructive" : "warning"} className="mt-4">
                    {analyticsData.budgetForecast?.riskLevel.toUpperCase().replace("_", " ")}
                  </Badge>
                </CardContent>
              </Card>

              <Card className="col-span-1 md:col-span-2 border border-slate-200 dark:border-slate-800">
                <CardHeader>
                  <CardTitle className="text-sm">Student Retention Risk Levels</CardTitle>
                  <p className="text-xs text-muted-foreground">Aggregated count of at-risk students</p>
                </CardHeader>
                <CardContent className="h-[240px]">
                  <ComparativeBarChart
                    data={[
                      { category: "High Risk", value: analyticsData.retentionRisk?.highRiskCount || 0 },
                      { category: "Moderate Risk", value: analyticsData.retentionRisk?.moderateRiskCount || 0 },
                      { category: "Low Risk", value: analyticsData.retentionRisk?.lowRiskCount || 0 }
                    ]}
                    title="Student Retention Risk Summary"
                  />
                </CardContent>
              </Card>

              <Card className="col-span-1 md:col-span-3 border border-slate-200 dark:border-slate-800">
                <CardHeader>
                  <CardTitle className="text-sm">At-Risk Students List (Intervention Queue)</CardTitle>
                  <p className="text-xs text-muted-foreground">Predictive list of students needing academic or financial support</p>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
                      <thead className="text-xs text-slate-700 uppercase bg-slate-50 dark:bg-slate-800 dark:text-slate-300">
                        <tr>
                          <th className="px-6 py-3">Student Name</th>
                          <th className="px-6 py-3">Risk Level</th>
                          <th className="px-6 py-3">Risk Drivers</th>
                          <th className="px-6 py-3">Recommended Intervention</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analyticsData.retentionRisk?.studentsAtRisk?.map((s: any, idx: number) => (
                          <tr key={idx} className="bg-white border-b dark:bg-slate-900 dark:border-slate-800">
                            <td className="px-6 py-4 font-semibold text-slate-950 dark:text-slate-100">{s.studentName}</td>
                            <td className="px-6 py-4">
                              <Badge variant={s.riskLevel === "HIGH" ? "destructive" : (s.riskLevel === "MEDIUM" ? "warning" : "success")}>
                                {s.riskLevel} ({s.riskScore}%)
                              </Badge>
                            </td>
                            <td className="px-6 py-4 text-xs text-slate-600 dark:text-slate-300">{s.primaryRiskDrivers?.join(", ") || "None"}</td>
                            <td className="px-6 py-4 text-xs font-medium text-slate-750 dark:text-slate-200">{s.recommendations?.join(", ") || "No action needed"}</td>
                          </tr>
                        ))}
                        {(!analyticsData.retentionRisk?.studentsAtRisk || analyticsData.retentionRisk.studentsAtRisk.length === 0) && (
                          <tr>
                            <td colSpan={4} className="px-6 py-4 text-center">No at-risk students identified. All students healthy.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      )}
    </div>
  );
}
