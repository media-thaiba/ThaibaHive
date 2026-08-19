import { TimeSeriesDecompositionEngine } from "../time-series-decomposition-engine";

describe("Sprint-011 Time-Series Financial Decomposition Engine", () => {
  let engine: TimeSeriesDecompositionEngine;

  beforeEach(() => {
    engine = new TimeSeriesDecompositionEngine();
  });

  it("decomposes observed series into trend, seasonal, and residual components", () => {
    // 24 months of simulated fee collection with trend + seasonality
    const observed = [
      100, 120, 110, 130, 105, 125, 115, 135, 110, 130, 120, 140,
      110, 130, 120, 140, 115, 135, 125, 145, 120, 140, 130, 150,
    ];

    const { trend, seasonal, residual } = engine.decomposeTimeSeries(observed, 12);

    expect(trend.length).toBe(24);
    expect(seasonal.length).toBe(24);
    expect(residual.length).toBe(24);

    // Sum of components should equal observed
    for (let i = 0; i < 24; i++) {
      expect(trend[i] + seasonal[i] + residual[i]).toBeCloseTo(observed[i], 4);
    }
  });

  it("runs full decomposition workflow and flags 3-sigma residual anomalies", async () => {
    // 24 months with a massive negative anomaly at month 14
    const observed = [
      100, 120, 110, 130, 105, 125, 115, 135, 110, 130, 120, 140,
      110, 130, 20, 140, 115, 135, 125, 145, 120, 140, 130, 150,
    ];

    const result = await engine.runDecomposition("inst_101", "fee_collections", observed, "monthly");

    expect(result.components.observed.length).toBe(24);
    expect(result.anomalies.length).toBeGreaterThan(0);
    const spike = result.anomalies.find((a) => a.index === 14);
    expect(spike).toBeDefined();
    expect(spike?.type).toBe("negative_anomaly");
  });
});
