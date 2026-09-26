"use client";

import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";

interface MobileMetric {
  id: string;
  nodeId: string;
  metricName: string;
  metricValue: number;
  timestamp: string;
}

interface AnomalyEvent {
  id: string;
  eventSource: string;
  severity: string;
  message: string;
  timestamp: string;
}

interface TuningPolicy {
  id: string;
  networkType: string;
  minBandwidthKbps: number;
  maxLatencyMs: number;
  batchSize: number;
  compressionLevel: number;
  retryBackoffMs: number;
  updatedAt: string;
}

export function MobileSyncDashboard() {
  const [windowHours, setWindowHours] = useState("24h");
  const [metrics, setMetrics] = useState<MobileMetric[]>([]);
  const [anomalies, setAnomalies] = useState<AnomalyEvent[]>([]);
  const [policies, setPolicies] = useState<TuningPolicy[]>([]);
  const [_loading, setLoading] = useState(true);
  const [savingPolicyId, setSavingPolicyId] = useState<string | null>(null);

  const fetchDiagnostics = async (hours: string) => {
    try {
      setLoading(true);
      const windowVal = hours === "1h" ? "1" : hours === "7d" ? "168" : "24";
      const res = await fetch(`/api/admin/mobile/diagnostics?window=${windowVal}`);
      if (!res.ok) throw new Error("Failed to fetch diagnostics");
      const data = await res.json();
      setMetrics(data.metrics || []);
      setAnomalies(data.anomalies || []);
    } catch {
      toast.error("Failed to load mobile diagnostics telemetry");
    } finally {
      setLoading(false);
    }
  };

  const fetchPolicies = async () => {
    try {
      const res = await fetch("/api/admin/sync-policies");
      if (!res.ok) throw new Error("Failed to fetch policies");
      const data = await res.json();
      setPolicies(data.policies || []);
    } catch {
      toast.error("Failed to load sync tuning policies");
    }
  };

  useEffect(() => {
    fetchDiagnostics(windowHours);
    fetchPolicies();
  }, [windowHours]);

  const handlePolicyChange = (id: string, field: keyof TuningPolicy, value: any) => {
    setPolicies((prev) =>
      prev.map((p) => {
        if (p.id === id) {
          return { ...p, [field]: value };
        }
        return p;
      })
    );
  };

  const handleSavePolicy = async (id: string) => {
    const policy = policies.find((p) => p.id === id);
    if (!policy) return;

    // Validate inputs locally
    if (policy.compressionLevel < 1 || policy.compressionLevel > 9) {
      toast.error("Compression level must be between 1 and 9");
      return;
    }
    if (policy.batchSize < 1 || policy.batchSize > 200) {
      toast.error("Max batch size must be between 1 and 200");
      return;
    }
    if (policy.retryBackoffMs < 1000 || policy.retryBackoffMs > 120000) {
      toast.error("Retry backoff must be between 1,000ms and 120,000ms");
      return;
    }

    try {
      setSavingPolicyId(id);
      const res = await fetch("/api/admin/sync-policies", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(policy),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to save policy");
      }

      toast.success(`Tuning policy for ${policy.networkType} saved successfully.`);
      fetchPolicies();
    } catch (err: any) {
      toast.error(err.message || "Failed to update tuning policy");
    } finally {
      setSavingPolicyId(null);
    }
  };

  // Aggregate stats
  const rawBytesMetrics = metrics.filter((m) => m.metricName === "mobile_sync_raw_bytes");
  const compBytesMetrics = metrics.filter((m) => m.metricName === "mobile_sync_compressed_bytes");
  const ratioMetrics = metrics.filter((m) => m.metricName === "mobile_sync_compression_ratio");
  const latencyMetrics = metrics.filter((m) => m.metricName === "mobile_sync_latency_ms");
  const outcomeMetrics = metrics.filter((m) => m.metricName === "mobile_sync_outcome");

  const totalRawBytes = rawBytesMetrics.reduce((sum, m) => sum + m.metricValue, 0);
  const totalCompBytes = compBytesMetrics.reduce((sum, m) => sum + m.metricValue, 0);

  const averageRatio = ratioMetrics.length > 0
    ? ratioMetrics.reduce((sum, m) => sum + m.metricValue, 0) / ratioMetrics.length
    : 0;

  const averageLatency = latencyMetrics.length > 0
    ? latencyMetrics.reduce((sum, m) => sum + m.metricValue, 0) / latencyMetrics.length
    : 0;

  const totalRuns = outcomeMetrics.length;
  const successRuns = outcomeMetrics.filter((m) => m.metricValue > 0.5).length;
  const successRate = totalRuns > 0 ? (successRuns / totalRuns) * 100.0 : 100.0;

  // Formatting helpers
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // SVGs Charting helpers for compression ratio history
  const chartPoints = ratioMetrics.slice(-20).reverse();
  const width = 600;
  const height = 120;
  const maxVal = Math.max(...chartPoints.map((p) => p.metricValue), 1.0);
  const minVal = Math.min(...chartPoints.map((p) => p.metricValue), 0.0);
  const range = maxVal - minVal || 1.0;
  const svgPoints = chartPoints
    .map((p, idx) => {
      const x = (idx / (chartPoints.length - 1 || 1)) * (width - 40) + 20;
      const y = height - ((p.metricValue - minVal) / range) * (height - 30) - 15;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div className="space-y-6">
      {/* Timeframe Selector and Heading */}
      <div className="flex items-center justify-between pb-2 border-b border-border">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Mobile Diagnostics Telemetry</h2>
          <p className="text-muted-foreground text-xs">
            Review mobile compression efficiencies, sync latency baselines, success rates, and active fleet policies.
          </p>
        </div>
        <div className="flex space-x-1">
          {["1h", "24h", "7d"].map((tf) => (
            <Button
              key={tf}
              variant={windowHours === tf ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setWindowHours(tf);
                fetchDiagnostics(tf);
              }}
              className="h-8 text-xs"
            >
              {tf.toUpperCase()}
            </Button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Mobile Sync Volume (Gzip)</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold font-mono text-emerald-500">
              {formatBytes(totalCompBytes)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Raw Size: <span className="font-mono">{formatBytes(totalRawBytes)}</span>
            </p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Fleet Compression Savings</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold font-mono text-sky-400">
              {(averageRatio * 100).toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Average bandwidth reduction
            </p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Average Latency</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold font-mono text-purple-400">
              {averageLatency > 0 ? `${averageLatency.toFixed(1)}ms` : "N/A"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Endpoint push latency baseline
            </p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Sync Success Rate</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold font-mono text-emerald-400">
              {successRate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Successful transactions / total ({successRuns}/{totalRuns})
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Visual Chart and Anomalies Grid */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-6">
        {/* Compression Efficiency Trend Chart */}
        <Card className="md:col-span-3 border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold">Compression Efficiency Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="w-full h-[120px] bg-muted/20 rounded border border-border overflow-hidden relative">
              {chartPoints.length > 1 ? (
                <svg className="w-full h-full" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="comp-gradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  <path
                    d={`M 20,${height - 20} L ${svgPoints} L ${width - 20},${height - 20} Z`}
                    fill="url(#comp-gradient)"
                  />
                  <polyline fill="none" stroke="#38bdf8" strokeWidth="2" points={svgPoints} />
                </svg>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
                  Insufficient historical metrics for plotting
                </div>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground mt-2 text-right">
              Plotting last {chartPoints.length} sync transactions
            </p>
          </CardContent>
        </Card>

        {/* Anomalies Table */}
        <Card className="md:col-span-3 border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold">Compression & Latency Anomalies</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-[140px] overflow-y-auto border border-border rounded">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="py-2 text-[10px] uppercase">Device/Event</TableHead>
                    <TableHead className="py-2 text-[10px] uppercase text-right">Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {anomalies.length > 0 ? (
                    anomalies.map((anom) => (
                      <TableRow key={anom.id}>
                        <TableCell className="py-2 text-xs font-medium max-w-[180px] truncate">
                          {anom.message.includes("Device") 
                            ? anom.message.split("Device")[1]?.split("achieved")[0]?.trim() || "Mobile Device"
                            : "Anomaly"}
                        </TableCell>
                        <TableCell className="py-2 text-xs text-right text-amber-500 font-mono">
                          {anom.message.includes("only") 
                            ? `${anom.message.split("only")[1]?.split("savings")[0]?.trim()} savings`
                            : "Deviation"}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={2} className="py-4 text-center text-xs text-muted-foreground">
                        No fleet-wide compression anomalies recorded
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Network Tuning Policies Card */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle>Mobile Sync Tuning Policies</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Configure dynamic sync thresholds and parameters applied based on client network indicators.
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {["WIFI", "CELLULAR", "DEFAULT"].map((netType) => {
              const policy = policies.find((p) => p.networkType === netType);
              if (!policy) {
                return (
                  <Card key={netType} className="bg-muted/30 border border-dashed border-border p-6 flex flex-col justify-center items-center">
                    <span className="text-sm font-semibold text-muted-foreground">{netType} Policy</span>
                    <span className="text-xs text-muted-foreground mt-2">Loading/Not Configured...</span>
                  </Card>
                );
              }

              return (
                <Card key={policy.id} className="border-border bg-card/60 p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-border pb-2">
                    <span className="text-sm font-bold text-foreground">{policy.networkType} Connection</span>
                    <Badge variant={policy.networkType === "WIFI" ? "success" : policy.networkType === "CELLULAR" ? "warning" : "secondary"}>
                      Active Policy
                    </Badge>
                  </div>

                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2 items-center">
                      <Label htmlFor={`batch-${policy.id}`} className="text-xs text-muted-foreground">Max Batch Size</Label>
                      <Input
                        id={`batch-${policy.id}`}
                        type="number"
                        min={1}
                        max={200}
                        value={policy.batchSize}
                        onChange={(e) => handlePolicyChange(policy.id, "batchSize", parseInt(e.target.value, 10) || 1)}
                        className="h-8 text-xs font-mono text-right"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2 items-center">
                      <Label htmlFor={`comp-${policy.id}`} className="text-xs text-muted-foreground">Compression Level (1-9)</Label>
                      <Input
                        id={`comp-${policy.id}`}
                        type="number"
                        min={1}
                        max={9}
                        value={policy.compressionLevel}
                        onChange={(e) => handlePolicyChange(policy.id, "compressionLevel", parseInt(e.target.value, 10) || 1)}
                        className="h-8 text-xs font-mono text-right"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2 items-center">
                      <Label htmlFor={`backoff-${policy.id}`} className="text-xs text-muted-foreground">Retry Backoff (ms)</Label>
                      <Input
                        id={`backoff-${policy.id}`}
                        type="number"
                        min={1000}
                        max={120000}
                        value={policy.retryBackoffMs}
                        onChange={(e) => handlePolicyChange(policy.id, "retryBackoffMs", parseInt(e.target.value, 10) || 1000)}
                        className="h-8 text-xs font-mono text-right"
                      />
                    </div>

                    {policy.networkType !== "DEFAULT" && (
                      <>
                        <div className="grid grid-cols-2 gap-2 items-center">
                          <Label htmlFor={`bandwidth-${policy.id}`} className="text-xs text-muted-foreground">Min Bandwidth (kbps)</Label>
                          <Input
                            id={`bandwidth-${policy.id}`}
                            type="number"
                            min={0}
                            value={policy.minBandwidthKbps}
                            onChange={(e) => handlePolicyChange(policy.id, "minBandwidthKbps", parseInt(e.target.value, 10) || 0)}
                            className="h-8 text-xs font-mono text-right"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2 items-center">
                          <Label htmlFor={`latency-${policy.id}`} className="text-xs text-muted-foreground">Max Latency (ms)</Label>
                          <Input
                            id={`latency-${policy.id}`}
                            type="number"
                            min={0}
                            value={policy.maxLatencyMs}
                            onChange={(e) => handlePolicyChange(policy.id, "maxLatencyMs", parseInt(e.target.value, 10) || 0)}
                            className="h-8 text-xs font-mono text-right"
                          />
                        </div>
                      </>
                    )}
                  </div>

                  <div className="pt-2 flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground">
                      Updated: {new Date(policy.updatedAt).toLocaleDateString()}
                    </span>
                    <Button
                      size="sm"
                      disabled={savingPolicyId === policy.id}
                      onClick={() => handleSavePolicy(policy.id)}
                      className="h-8 text-xs px-4"
                    >
                      {savingPolicyId === policy.id ? "Saving..." : "Save Policy"}
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
