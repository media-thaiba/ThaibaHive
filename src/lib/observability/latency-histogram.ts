/**
 * @module LatencyHistogram
 * High-performance, lightweight in-memory latency percentile histogram.
 * Provides sub-millisecond to 60,000ms+ tracking with accurate p50/p90/p95/p99 calculation.
 * Zero external dependencies — compatible with Node.js and Edge runtimes.
 */

export interface LatencySnapshot {
  count: number;
  sum: number;
  min: number;
  max: number;
  mean: number;
  p50: number;
  p90: number;
  p95: number;
  p99: number;
}

export class LatencyHistogram {
  private count = 0;
  private sum = 0;
  private min = Infinity;
  private max = 0;

  // Reservoir sampling buffer for precise percentile interpolation (size 2048)
  private readonly sampleCapacity = 2048;
  private samples: Float64Array;
  private sampleCount = 0;
  private isSorted = false;

  // Exponential bucket boundaries (in ms) for high-volume quantile approximation
  // Buckets: [0-5], [5-10], [10-25], [25-50], [50-100], [100-250], [250-500], [500-1000], [1000-2500], [2500-5000], [5000-10000], [10000-30000], [30000-60000], [60000+]
  private static readonly BUCKET_LIMITS = [
    5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000, 30000, 60000,
  ];
  private bucketCounts: Uint32Array;

  constructor() {
    this.samples = new Float64Array(this.sampleCapacity);
    this.bucketCounts = new Uint32Array(LatencyHistogram.BUCKET_LIMITS.length + 1);
  }

  /**
   * Record a latency duration in milliseconds.
   * Constant time O(1) operation.
   */
  record(durationMs: number): void {
    const val = Math.max(0, durationMs);
    this.count++;
    this.sum += val;
    if (val < this.min) this.min = val;
    if (val > this.max) this.max = val;

    // 1. Update bucket counters
    let bucketIndex = LatencyHistogram.BUCKET_LIMITS.length;
    for (let i = 0; i < LatencyHistogram.BUCKET_LIMITS.length; i++) {
      if (val <= LatencyHistogram.BUCKET_LIMITS[i]) {
        bucketIndex = i;
        break;
      }
    }
    this.bucketCounts[bucketIndex]++;

    // 2. Reservoir sampling (Algorithm R)
    if (this.sampleCount < this.sampleCapacity) {
      this.samples[this.sampleCount] = val;
      this.sampleCount++;
      this.isSorted = false;
    } else {
      // Replace with probability (sampleCapacity / count)
      const j = Math.floor(Math.random() * this.count);
      if (j < this.sampleCapacity) {
        this.samples[j] = val;
        this.isSorted = false;
      }
    }
  }

  /**
   * Calculate exact or interpolated percentile (0 to 100 or 0 to 1).
   */
  getPercentile(percentile: number): number {
    if (this.count === 0) return 0;
    if (this.count === 1) return this.samples[0] ?? this.sum;

    const p = percentile > 1 ? percentile / 100 : percentile;
    const clampedP = Math.max(0, Math.min(1, p));

    // When sample count is sufficient, use sorted reservoir samples
    if (this.sampleCount > 0) {
      if (!this.isSorted) {
        // Sort active sample slice
        const activeSlice = this.samples.subarray(0, this.sampleCount);
        activeSlice.sort();
        this.isSorted = true;
      }

      const index = clampedP * (this.sampleCount - 1);
      const lower = Math.floor(index);
      const upper = Math.ceil(index);
      const weight = index - lower;

      if (lower === upper) {
        return Number((this.samples[lower]).toFixed(2));
      }

      const interpolated = (1 - weight) * this.samples[lower] + weight * this.samples[upper];
      return Number(interpolated.toFixed(2));
    }

    return Number((this.sum / this.count).toFixed(2));
  }

  /**
   * Get complete statistical snapshot.
   */
  getSnapshot(): LatencySnapshot {
    if (this.count === 0) {
      return {
        count: 0,
        sum: 0,
        min: 0,
        max: 0,
        mean: 0,
        p50: 0,
        p90: 0,
        p95: 0,
        p99: 0,
      };
    }

    const mean = Number((this.sum / this.count).toFixed(2));
    return {
      count: this.count,
      sum: Number(this.sum.toFixed(2)),
      min: Number(this.min.toFixed(2)),
      max: Number(this.max.toFixed(2)),
      mean,
      p50: this.getPercentile(0.5),
      p90: this.getPercentile(0.9),
      p95: this.getPercentile(0.95),
      p99: this.getPercentile(0.99),
    };
  }

  /**
   * Clone histogram state.
   */
  clone(): LatencyHistogram {
    const copy = new LatencyHistogram();
    copy.count = this.count;
    copy.sum = this.sum;
    copy.min = this.min;
    copy.max = this.max;
    copy.sampleCount = this.sampleCount;
    copy.samples.set(this.samples);
    copy.bucketCounts.set(this.bucketCounts);
    copy.isSorted = this.isSorted;
    return copy;
  }

  /**
   * Reset histogram state.
   */
  reset(): void {
    this.count = 0;
    this.sum = 0;
    this.min = Infinity;
    this.max = 0;
    this.sampleCount = 0;
    this.isSorted = false;
    this.samples.fill(0);
    this.bucketCounts.fill(0);
  }
}
