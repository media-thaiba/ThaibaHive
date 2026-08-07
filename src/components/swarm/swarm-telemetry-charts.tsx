"use client";

import * as React from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

interface MetricPoint {
  id: string;
  nodeId: string;
  metricName: string;
  metricValue: number;
  timestamp: string;
}

interface SwarmTelemetryChartsProps {
  metrics: MetricPoint[];
}

export function SwarmTelemetryCharts({ metrics }: SwarmTelemetryChartsProps) {
  const [stats, setStats] = React.useState({
    avgProcessingTime: 0,
    completionSuccessRate: 100,
    failedJobsTotal: 0,
  });
  const [recentJobs, setRecentJobs] = React.useState<any[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  const activeConcurrency = React.useMemo(() => {
    const loadMetric = [...metrics]
      .reverse()
      .find((m) => m.metricName === "worker_concurrency_load");
    return loadMetric ? loadMetric.metricValue : 0;
  }, [metrics]);

  const processingJobs = React.useMemo(() => {
    return recentJobs.filter((j) => j.status === "processing");
  }, [recentJobs]);

  const fetchTelemetryStats = React.useCallback(async () => {
    try {
      const res = await fetch("/api/admin/swarm/queue-telemetry");
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch {
      // Silent catch
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchRecentJobs = React.useCallback(async () => {
    try {
      const res = await fetch("/api/admin/scheduled-jobs");
      if (res.ok) {
        const data = await res.json();
        setRecentJobs((data.jobs || []).slice(0, 5));
      }
    } catch {
      // Silent catch
    }
  }, []);

  React.useEffect(() => {
    fetchTelemetryStats();
    fetchRecentJobs();

    const statsInterval = setInterval(fetchTelemetryStats, 10000);
    const jobsInterval = setInterval(fetchRecentJobs, 10000);

    return () => {
      clearInterval(statsInterval);
      clearInterval(jobsInterval);
    };
  }, [fetchTelemetryStats, fetchRecentJobs]);

  // Group metrics by timestamp to construct chart data points
  const chartData = React.useMemo(() => {
    const relevant = metrics.filter((m) =>
      ["queue_backlog_size", "worker_concurrency_load", "job_failure_retry_rate"].includes(m.metricName)
    );

    const grouped: Record<string, { time: string; backlog: number; load: number; retries: number }> = {};
    relevant.forEach((m) => {
      const timeStr = new Date(m.timestamp).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
      if (!grouped[timeStr]) {
        grouped[timeStr] = { time: timeStr, backlog: 0, load: 0, retries: 0 };
      }
      if (m.metricName === "queue_backlog_size") grouped[timeStr].backlog = m.metricValue;
      if (m.metricName === "worker_concurrency_load") grouped[timeStr].load = m.metricValue;
      if (m.metricName === "job_failure_retry_rate") grouped[timeStr].retries = m.metricValue;
    });

    return Object.values(grouped)
      .sort((a, b) => a.time.localeCompare(b.time))
      .slice(-20);
  }, [metrics]);

  const displayData = chartData.length > 0 ? chartData : [
    { time: "00:00:00", backlog: 2, load: 1, retries: 0 },
    { time: "00:00:10", backlog: 1, load: 1, retries: 0 },
    { time: "00:00:20", backlog: 0, load: 1, retries: 0 },
    { time: "00:00:30", backlog: 4, load: 2, retries: 1 },
    { time: "00:00:40", backlog: 3, load: 2, retries: 1 },
    { time: "00:00:50", backlog: 1, load: 1, retries: 0 },
  ];

  return (
    <div className="space-y-6">
      {/* Aggregated Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-card p-6 rounded-xl border border-border space-y-2">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Average Processing Time
          </div>
          {isLoading ? (
            <Skeleton className="h-8 w-24" />
          ) : (
            <div className="text-3xl font-bold tracking-tight">
              {stats.avgProcessingTime} <span className="text-lg font-normal text-muted-foreground">seconds</span>
            </div>
          )}
          <p className="text-xs text-muted-foreground">Mean duration across successful report compile tasks.</p>
        </div>

        <div className="bg-card p-6 rounded-xl border border-border space-y-2">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Task Success Rate
          </div>
          {isLoading ? (
            <Skeleton className="h-8 w-24" />
          ) : (
            <div className="text-3xl font-bold tracking-tight">
              {stats.completionSuccessRate}%
            </div>
          )}
          <p className="text-xs text-muted-foreground">Percentage of successful compilations over all attempts.</p>
        </div>

        <div className="bg-card p-6 rounded-xl border border-border space-y-2">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Total Hard Failures
          </div>
          {isLoading ? (
            <Skeleton className="h-8 w-24" />
          ) : (
            <div className="text-3xl font-bold tracking-tight text-destructive">
              {stats.failedJobsTotal}
            </div>
          )}
          <p className="text-xs text-muted-foreground">Report queue tasks that failed after all retry attempts.</p>
        </div>
      </div>

      {/* Concurrency Gauge & Active Pipeline Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Concurrency Gauge card */}
        <div className="bg-card p-6 rounded-xl border border-border space-y-4 lg:col-span-1 flex flex-col justify-between">
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Worker Concurrency Load</h4>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold tracking-tight">{activeConcurrency}</span>
              <span className="text-lg text-muted-foreground">/ 2 active slots</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Maximum queue worker capability is configured to 2 concurrent report generation slots.
            </p>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-semibold">
              <span>Concurrency Utilization</span>
              <span>{Math.round((activeConcurrency / 2) * 100)}%</span>
            </div>
            <div className="h-3 w-full bg-muted rounded-full overflow-hidden border border-border/50">
              <div 
                className={`h-full transition-all duration-500 rounded-full ${
                  activeConcurrency === 2 
                    ? "bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]" 
                    : activeConcurrency === 1 
                    ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" 
                    : "bg-slate-700"
                }`}
                style={{ width: `${(activeConcurrency / 2) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* SVG Pipeline Map card */}
        <div className="bg-card p-6 rounded-xl border border-border space-y-4 lg:col-span-2">
          <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Active Execution Pipeline Topology</h4>
          <div className="relative h-48 w-full border border-border/50 rounded-lg bg-black/20 flex items-center justify-center overflow-hidden">
            <svg className="absolute inset-0 w-full h-full">
              <defs>
                <filter id="glow-green" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>
              
              {/* Path from Queue to Worker 1 */}
              <path
                d="M 80 96 L 240 48"
                stroke={activeConcurrency > 0 ? "#10b981" : "#334155"}
                strokeWidth="2"
                strokeDasharray={activeConcurrency > 0 ? "4 4" : "none"}
                className={activeConcurrency > 0 ? "animate-pulse" : ""}
                style={activeConcurrency > 0 ? { filter: "url(#glow-green)" } : {}}
              />
              
              {/* Path from Queue to Worker 2 */}
              <path
                d="M 80 96 L 240 144"
                stroke={activeConcurrency > 1 ? "#10b981" : "#334155"}
                strokeWidth="2"
                strokeDasharray={activeConcurrency > 1 ? "4 4" : "none"}
                className={activeConcurrency > 1 ? "animate-pulse" : ""}
                style={activeConcurrency > 1 ? { filter: "url(#glow-green)" } : {}}
              />
            </svg>

            {/* Queue Node */}
            <div className="absolute left-8 flex flex-col items-center space-y-1">
              <div className="h-12 w-12 rounded-full bg-blue-500/10 border border-blue-500/80 flex items-center justify-center text-blue-400 font-bold text-xs shadow-[0_0_12px_rgba(59,130,246,0.2)]">
                Queue
              </div>
              <span className="text-[10px] text-muted-foreground font-mono">
                Backlog: {recentJobs.filter(j => j.status === 'queued').length}
              </span>
            </div>

            {/* Worker 1 Node */}
            <div className="absolute right-16 top-6 flex flex-col items-center space-y-1">
              <div className={`h-12 w-12 rounded-full border flex items-center justify-center font-bold text-xs transition-all duration-300 ${
                activeConcurrency > 0 
                  ? "bg-emerald-500/10 border-emerald-500/80 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)]" 
                  : "bg-slate-900/40 border-slate-800 text-slate-600"
              }`}>
                W1
              </div>
              <span className="text-[10px] text-muted-foreground max-w-[90px] truncate text-center font-mono">
                {processingJobs[0] ? `Job: ${processingJobs[0].id.substring(0, 8)}` : "Idle"}
              </span>
            </div>

            {/* Worker 2 Node */}
            <div className="absolute right-16 bottom-6 flex flex-col items-center space-y-1">
              <div className={`h-12 w-12 rounded-full border flex items-center justify-center font-bold text-xs transition-all duration-300 ${
                activeConcurrency > 1 
                  ? "bg-emerald-500/10 border-emerald-500/80 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)]" 
                  : "bg-slate-900/40 border-slate-800 text-slate-600"
              }`}>
                W2
              </div>
              <span className="text-[10px] text-muted-foreground max-w-[90px] truncate text-center font-mono">
                {processingJobs[1] ? `Job: ${processingJobs[1].id.substring(0, 8)}` : "Idle"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Real-time Timeline Chart */}
      <div className="bg-card p-6 rounded-xl border border-border space-y-4">
        <div>
          <h3 className="text-lg font-bold tracking-tight">Queue Status Timeline</h3>
          <p className="text-sm text-muted-foreground">
            Real-time backlog counts, concurrency worker loads, and retry execution frequencies.
          </p>
        </div>

        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={displayData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorBacklog" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorLoad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorRetries" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="time" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--popover))",
                  borderColor: "hsl(var(--border))",
                  borderRadius: "8px",
                  color: "hsl(var(--popover-foreground))",
                  fontSize: "12px",
                }}
              />
              <Area
                type="monotone"
                dataKey="backlog"
                name="Backlog size"
                stroke="#3b82f6"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorBacklog)"
              />
              <Area
                type="monotone"
                dataKey="load"
                name="Worker load"
                stroke="#10b981"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorLoad)"
              />
              <Area
                type="monotone"
                dataKey="retries"
                name="Retry rate"
                stroke="#f59e0b"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorRetries)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Queue Operations */}
      <div className="bg-card p-6 rounded-xl border border-border space-y-4">
        <div>
          <h3 className="text-lg font-bold tracking-tight">Recent Queue Operations</h3>
          <p className="text-sm text-muted-foreground">
            Snapshot of the most recent report compilations submitted to the worker queue.
          </p>
        </div>

        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-left text-sm text-foreground">
            <thead className="bg-muted/50 text-xs font-semibold text-muted-foreground uppercase border-b border-border">
              <tr>
                <th className="px-4 py-3">Job ID</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Format</th>
                <th className="px-4 py-3">Institution</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Last Update</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {recentJobs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    No recent queue operations found.
                  </td>
                </tr>
              ) : (
                recentJobs.map((job) => (
                  <tr key={job.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs">{job.id.substring(0, 8)}...</td>
                    <td className="px-4 py-3 capitalize">{job.type}</td>
                    <td className="px-4 py-3 uppercase">{job.format}</td>
                    <td className="px-4 py-3 font-mono text-xs">{job.institutionId}</td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={
                          job.status === "success"
                            ? "success"
                            : job.status === "failed"
                            ? "destructive"
                            : job.status === "processing"
                            ? "info"
                            : job.status === "paused"
                            ? "warning"
                            : "secondary"
                        }
                      >
                        {job.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {new Date(job.updatedAt || job.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
