import { LatencyHistogram } from "../latency-histogram";

describe("LatencyHistogram Unit Tests", () => {
  let histogram: LatencyHistogram;

  beforeEach(() => {
    histogram = new LatencyHistogram();
  });

  test("handles empty histogram gracefully", () => {
    const snap = histogram.getSnapshot();
    expect(snap.count).toBe(0);
    expect(snap.min).toBe(0);
    expect(snap.max).toBe(0);
    expect(snap.mean).toBe(0);
    expect(snap.p50).toBe(0);
    expect(snap.p95).toBe(0);
    expect(snap.p99).toBe(0);
  });

  test("records single value accurately", () => {
    histogram.record(42.5);
    const snap = histogram.getSnapshot();
    expect(snap.count).toBe(1);
    expect(snap.min).toBe(42.5);
    expect(snap.max).toBe(42.5);
    expect(snap.mean).toBe(42.5);
    expect(snap.p50).toBe(42.5);
    expect(snap.p90).toBe(42.5);
    expect(snap.p95).toBe(42.5);
    expect(snap.p99).toBe(42.5);
  });

  test("calculates correct percentiles on uniform distribution", () => {
    // Record 1 to 100
    for (let i = 1; i <= 100; i++) {
      histogram.record(i);
    }
    const snap = histogram.getSnapshot();
    expect(snap.count).toBe(100);
    expect(snap.min).toBe(1);
    expect(snap.max).toBe(100);
    expect(snap.mean).toBe(50.5);

    // p50 should be around 50.5
    expect(snap.p50).toBeGreaterThanOrEqual(49.5);
    expect(snap.p50).toBeLessThanOrEqual(51.5);

    // p90 should be around 90.1
    expect(snap.p90).toBeGreaterThanOrEqual(89);
    expect(snap.p90).toBeLessThanOrEqual(91);

    // p95 should be around 95.05
    expect(snap.p95).toBeGreaterThanOrEqual(94);
    expect(snap.p95).toBeLessThanOrEqual(96);

    // p99 should be around 99.01
    expect(snap.p99).toBeGreaterThanOrEqual(98);
    expect(snap.p99).toBeLessThanOrEqual(100);
  });

  test("handles sub-millisecond values and extreme outliers", () => {
    histogram.record(0.12);
    histogram.record(0.45);
    histogram.record(50000); // 50s outlier

    const snap = histogram.getSnapshot();
    expect(snap.count).toBe(3);
    expect(snap.min).toBe(0.12);
    expect(snap.max).toBe(50000);
    expect(snap.p99).toBeGreaterThan(1000);
  });

  test("handles high volume reservoir sampling (10,000 requests)", () => {
    for (let i = 0; i < 10000; i++) {
      // Normal-like distribution centered at 50ms with occasional spikes
      const val = Math.random() < 0.95 ? 20 + Math.random() * 60 : 200 + Math.random() * 800;
      histogram.record(val);
    }

    const snap = histogram.getSnapshot();
    expect(snap.count).toBe(10000);
    expect(snap.p50).toBeLessThan(100);
    expect(snap.p99).toBeGreaterThan(100);
  });

  test("clones and resets state cleanly", () => {
    histogram.record(10);
    histogram.record(20);

    const clone = histogram.clone();
    expect(clone.getSnapshot().count).toBe(2);

    histogram.reset();
    expect(histogram.getSnapshot().count).toBe(0);
    expect(clone.getSnapshot().count).toBe(2);
  });
});
