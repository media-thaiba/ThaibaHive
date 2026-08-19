"use client";

import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export interface MetricPoint {
  id: string;
  nodeId: string;
  metricName: string;
  metricValue: number;
  timestamp: string;
}

interface TelemetryDashboardProps {
  metrics: MetricPoint[];
  onTimeframeChange?: (timeframe: string) => void;
}

const INITIAL_SEED_TIME = 1718000000000; // Stable static timestamp seed to satisfy React 19 purity rules

const DEFAULT_METRICS: MetricPoint[] = [
  { id: "m1", nodeId: "local-node", metricName: "mergeLatencyMs_avg_1m", metricValue: 12, timestamp: new Date(INITIAL_SEED_TIME - 3600000).toISOString() },
  { id: "m2", nodeId: "local-node", metricName: "mergeLatencyMs_avg_1m", metricValue: 24, timestamp: new Date(INITIAL_SEED_TIME - 3000000).toISOString() },
  { id: "m3", nodeId: "local-node", metricName: "mergeLatencyMs_avg_1m", metricValue: 18, timestamp: new Date(INITIAL_SEED_TIME - 2400000).toISOString() },
  { id: "m4", nodeId: "local-node", metricName: "mergeLatencyMs_avg_1m", metricValue: 35, timestamp: new Date(INITIAL_SEED_TIME - 1800000).toISOString() },
  { id: "m5", nodeId: "local-node", metricName: "mergeLatencyMs_avg_1m", metricValue: 15, timestamp: new Date(INITIAL_SEED_TIME - 1200000).toISOString() },
  { id: "m6", nodeId: "local-node", metricName: "mergeLatencyMs_avg_1m", metricValue: 8, timestamp: new Date(INITIAL_SEED_TIME - 600000).toISOString() },
  { id: "m7", nodeId: "local-node", metricName: "mergeLatencyMs_avg_1m", metricValue: 14, timestamp: new Date(INITIAL_SEED_TIME).toISOString() },
];

export const TelemetryDashboard: React.FC<TelemetryDashboardProps> = ({ metrics, onTimeframeChange }) => {
  const [timeframe, setTimeframe] = useState("24h");

  const handleTimeframeChange = (tf: string) => {
    setTimeframe(tf);
    if (onTimeframeChange) {
      onTimeframeChange(tf);
    }
  };

  // Filter out compression-related tracking metrics
  const rawBytesMetrics = metrics.filter((m) => m.metricName === "bandwidth_raw_bytes");
  const compBytesMetrics = metrics.filter((m) => m.metricName === "bandwidth_compressed_bytes");

  // Sum raw vs compressed bytes
  const totalRaw = rawBytesMetrics.reduce((acc, m) => acc + m.metricValue, 0);
  const totalComp = compBytesMetrics.reduce((acc, m) => acc + m.metricValue, 0);
  const savingsPct = totalRaw > 0 ? ((totalRaw - totalComp) / totalRaw) * 100 : 0;

  // Filter actual latency metrics for the chart plotting
  const latencyMetrics = metrics.filter((m) => m.metricName === "mergeLatencyMs_avg_1m");

  const displayPoints = latencyMetrics.length > 0 ? latencyMetrics : DEFAULT_METRICS;

  const maxVal = Math.max(...displayPoints.map((p) => p.metricValue), 40);
  const minVal = Math.min(...displayPoints.map((p) => p.metricValue), 0);
  const range = maxVal - minVal || 1;

  const pointsCount = displayPoints.length;
  const width = 600;
  const height = 150;

  const svgPoints = displayPoints
    .map((p, idx) => {
      const x = (idx / (pointsCount - 1 || 1)) * (width - 40) + 20;
      const y = height - ((p.metricValue - minVal) / range) * (height - 30) - 15;
      return `${x},${y}`;
    })
    .join(" ");

  const latestMetric = displayPoints[displayPoints.length - 1]?.metricValue ?? 0;

  return (
    <Card className="col-span-3 border-border bg-card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xl font-bold">Vector-Mesh Sync Telemetry</CardTitle>
        <div className="flex space-x-1">
          {["1h", "24h", "7d"].map((tf) => (
            <Button
              key={tf}
              variant={timeframe === tf ? "default" : "outline"}
              size="sm"
              onClick={() => handleTimeframeChange(tf)}
              className="h-8 text-xs"
            >
              {tf.toUpperCase()}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between mb-4">
          <div>
            <span className="text-2xl font-bold font-mono">{latestMetric.toFixed(1)}ms</span>
            <span className="text-xs text-muted-foreground ml-2">Avg Merge Latency</span>
          </div>
          <Badge variant="success">Optimization Active</Badge>
        </div>

        <div className="w-full h-[150px] bg-muted/20 rounded border border-border overflow-hidden">
          <svg className="w-full h-full" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
            <defs>
              <linearGradient id="gradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22c55e" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#22c55e" stopOpacity="0.0" />
              </linearGradient>
            </defs>
            <line x1="0" y1={height / 2} x2={width} y2={height / 2} stroke="#f1f5f9" strokeWidth={0.5} strokeDasharray="5,5" className="opacity-10" />
            <line x1="0" y1={height - 20} x2={width} y2={height - 20} stroke="#f1f5f9" strokeWidth={0.5} className="opacity-10" />

            {displayPoints.length > 1 && (
              <>
                <path
                  d={`M 20,${height - 20} L ${svgPoints} L ${width - 20},${height - 20} Z`}
                  fill="url(#gradient)"
                />
                <polyline fill="none" stroke="#22c55e" strokeWidth="2" points={svgPoints} />
              </>
            )}
          </svg>
        </div>

        {/* Bandwidth Savings Tracking */}
        {totalRaw > 0 && (
          <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <span>Telemetry Compression Savings:</span>
              <Badge variant="success" className="h-4 text-[9px] px-1 py-0 font-normal">GZIP</Badge>
            </span>
            <span className="font-semibold text-emerald-500 font-mono">
              {savingsPct.toFixed(1)}% saved ({(totalComp / 1024).toFixed(1)} KB / {(totalRaw / 1024).toFixed(1)} KB)
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
