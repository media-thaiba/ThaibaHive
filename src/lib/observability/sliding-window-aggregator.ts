/**
 * @module SlidingWindowAggregator
 * Manages rolling time-bucketed metric aggregation across active API routes.
 * Bounded memory structure capping active tracked routes to 250 with LRU eviction.
 */

import { LatencyHistogram, type LatencySnapshot } from "./latency-histogram";

export type WindowPeriod = "1m" | "5m" | "15m" | "1h";

export interface RouteMetricSummary {
  route: string;
  method: string;
  totalRequests: number;
  status2xx: number;
  status3xx: number;
  status4xx: number;
  status5xx: number;
  errorRate: number; // percentage (4xx + 5xx) / total
  latency: LatencySnapshot;
  lastActive: string;
}

export interface ClusterMetricsSnapshot {
  window: WindowPeriod;
  timestamp: string;
  totalRequests: number;
  totalErrors: number;
  errorRate: number;
  requestsPerMinute: number;
  globalLatency: LatencySnapshot;
  activeRoutesCount: number;
  routes: RouteMetricSummary[];
}

interface BucketData {
  timestamp: number; // bucket start ms
  totalRequests: number;
  status2xx: number;
  status3xx: number;
  status4xx: number;
  status5xx: number;
  histogram: LatencyHistogram;
}

class RouteMetricBucket {
  route: string;
  method: string;
  lastAccessTime: number;

  // 1-minute window: 6 buckets of 10 seconds
  buckets10s: BucketData[] = [];
  // 1-hour window: 60 buckets of 1 minute
  buckets1m: BucketData[] = [];

  constructor(route: string, method: string) {
    this.route = route;
    this.method = method;
    this.lastAccessTime = Date.now();
  }

  record(statusCode: number, durationMs: number, now = Date.now()): void {
    this.lastAccessTime = now;
    const bucketTime10s = Math.floor(now / 10000) * 10000;
    const bucketTime1m = Math.floor(now / 60000) * 60000;

    this.recordInBucketList(this.buckets10s, bucketTime10s, 6, statusCode, durationMs);
    this.recordInBucketList(this.buckets1m, bucketTime1m, 60, statusCode, durationMs);
  }

  private recordInBucketList(
    buckets: BucketData[],
    bucketTime: number,
    maxBuckets: number,
    statusCode: number,
    durationMs: number
  ): void {
    let current = buckets.find((b) => b.timestamp === bucketTime);
    if (!current) {
      current = {
        timestamp: bucketTime,
        totalRequests: 0,
        status2xx: 0,
        status3xx: 0,
        status4xx: 0,
        status5xx: 0,
        histogram: new LatencyHistogram(),
      };
      buckets.push(current);
    }

    current.totalRequests++;
    if (statusCode >= 200 && statusCode < 300) current.status2xx++;
    else if (statusCode >= 300 && statusCode < 400) current.status3xx++;
    else if (statusCode >= 400 && statusCode < 500) current.status4xx++;
    else if (statusCode >= 500) current.status5xx++;

    current.histogram.record(durationMs);

    // Prune buckets older than retention window
    const cutoff = bucketTime - maxBuckets * (maxBuckets === 6 ? 10000 : 60000);
    while (buckets.length > 0 && buckets[0].timestamp < cutoff) {
      buckets.shift();
    }
  }

  getSummary(window: WindowPeriod, now = Date.now()): RouteMetricSummary {
    const { durationMs, buckets } = this.getBucketsForWindow(window);
    const cutoff = now - durationMs;

    let total = 0;
    let s2xx = 0;
    let s3xx = 0;
    let s4xx = 0;
    let s5xx = 0;
    const combinedHistogram = new LatencyHistogram();

    for (const b of buckets) {
      if (b.timestamp >= cutoff) {
        total += b.totalRequests;
        s2xx += b.status2xx;
        s3xx += b.status3xx;
        s4xx += b.status4xx;
        s5xx += b.status5xx;

        // Replay snapshot percentiles into combined histogram
        const snap = b.histogram.getSnapshot();
        if (snap.count > 0) {
          combinedHistogram.record(snap.p50);
          combinedHistogram.record(snap.p90);
          combinedHistogram.record(snap.p95);
          combinedHistogram.record(snap.p99);
        }
      }
    }

    const errors = s4xx + s5xx;
    const errorRate = total > 0 ? Number(((errors / total) * 100).toFixed(2)) : 0;

    return {
      route: this.route,
      method: this.method,
      totalRequests: total,
      status2xx: s2xx,
      status3xx: s3xx,
      status4xx: s4xx,
      status5xx: s5xx,
      errorRate,
      latency: combinedHistogram.getSnapshot(),
      lastActive: new Date(this.lastAccessTime).toISOString(),
    };
  }

  private getBucketsForWindow(window: WindowPeriod): { durationMs: number; buckets: BucketData[] } {
    switch (window) {
      case "1m":
        return { durationMs: 60000, buckets: this.buckets10s };
      case "5m":
        return { durationMs: 300000, buckets: this.buckets1m };
      case "15m":
        return { durationMs: 900000, buckets: this.buckets1m };
      case "1h":
      default:
        return { durationMs: 3600000, buckets: this.buckets1m };
    }
  }
}

export class SlidingWindowAggregator {
  private static instance: SlidingWindowAggregator | null = null;
  private readonly maxRoutes = 250;
  private routeMap: Map<string, RouteMetricBucket> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  private constructor() {
    // Run periodic purge every 60 seconds
    if (typeof setInterval !== "undefined") {
      this.cleanupInterval = setInterval(() => this.purgeStaleRoutes(), 60000);
      if (this.cleanupInterval.unref) {
        this.cleanupInterval.unref();
      }
    }
  }

  static getInstance(): SlidingWindowAggregator {
    if (!SlidingWindowAggregator.instance) {
      SlidingWindowAggregator.instance = new SlidingWindowAggregator();
    }
    return SlidingWindowAggregator.instance;
  }

  /**
   * Record a completed HTTP request.
   */
  recordRequest(route: string, method: string, statusCode: number, durationMs: number): void {
    const key = `${method.toUpperCase()} ${route}`;
    let bucket = this.routeMap.get(key);

    if (!bucket) {
      // LRU Eviction if max routes exceeded
      if (this.routeMap.size >= this.maxRoutes) {
        this.evictOldestRoute();
      }
      bucket = new RouteMetricBucket(route, method.toUpperCase());
      this.routeMap.set(key, bucket);
    }

    bucket.record(statusCode, durationMs);
  }

  /**
   * Get telemetry snapshot for specified time window.
   */
  getMetricsSnapshot(window: WindowPeriod = "5m"): ClusterMetricsSnapshot {
    const now = Date.now();
    const routeSummaries: RouteMetricSummary[] = [];
    let clusterTotal = 0;
    let clusterErrors = 0;
    const globalHistogram = new LatencyHistogram();

    for (const bucket of this.routeMap.values()) {
      const summary = bucket.getSummary(window, now);
      if (summary.totalRequests > 0) {
        routeSummaries.push(summary);
        clusterTotal += summary.totalRequests;
        clusterErrors += summary.status4xx + summary.status5xx;

        if (summary.latency.count > 0) {
          globalHistogram.record(summary.latency.p50);
          globalHistogram.record(summary.latency.p90);
          globalHistogram.record(summary.latency.p95);
          globalHistogram.record(summary.latency.p99);
        }
      }
    }

    // Sort routes by total requests descending
    routeSummaries.sort((a, b) => b.totalRequests - a.totalRequests);

    const windowMinutes = window === "1m" ? 1 : window === "5m" ? 5 : window === "15m" ? 15 : 60;
    const rpm = Number((clusterTotal / windowMinutes).toFixed(2));
    const errorRate = clusterTotal > 0 ? Number(((clusterErrors / clusterTotal) * 100).toFixed(2)) : 0;

    return {
      window,
      timestamp: new Date(now).toISOString(),
      totalRequests: clusterTotal,
      totalErrors: clusterErrors,
      errorRate,
      requestsPerMinute: rpm,
      globalLatency: globalHistogram.getSnapshot(),
      activeRoutesCount: routeSummaries.length,
      routes: routeSummaries,
    };
  }

  private evictOldestRoute(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, bucket] of this.routeMap.entries()) {
      if (bucket.lastAccessTime < oldestTime) {
        oldestTime = bucket.lastAccessTime;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.routeMap.delete(oldestKey);
    }
  }

  private purgeStaleRoutes(): void {
    const oneHourAgo = Date.now() - 3600000;
    for (const [key, bucket] of this.routeMap.entries()) {
      if (bucket.lastAccessTime < oneHourAgo) {
        this.routeMap.delete(key);
      }
    }
  }

  reset(): void {
    this.routeMap.clear();
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.reset();
  }
}
