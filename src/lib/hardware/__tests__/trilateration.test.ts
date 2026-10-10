import { TrilaterationEngine, AnchorObservation } from "../trilateration-engine";

describe("TrilaterationEngine", () => {
  describe("Rolling Median Filter", () => {
    it("rejects extreme multipath outliers accurately", () => {
      const samples = [-65, -64, -20, -66, -65]; // -20 is a multipath reflection spike
      const median = TrilaterationEngine.rollingMedian(samples);
      expect(median).toBe(-65);
    });

    it("handles even and odd sample lengths", () => {
      expect(TrilaterationEngine.rollingMedian([-70, -60])).toBe(-65);
      expect(TrilaterationEngine.rollingMedian([-80, -75, -70])).toBe(-75);
    });
  });

  describe("1D Kalman Filter RSSI Smoothing", () => {
    it("smooths raw noisy RSSI measurements towards true mean", () => {
      let estimate = -80;
      let cov = 1.0;

      // Simulate 10 noisy measurements around true -65 dBm
      const noisyStream = [-64, -66, -63, -67, -65, -64, -65, -66, -65, -64];
      for (const raw of noisyStream) {
        const result = TrilaterationEngine.smoothRssiKalman(raw, estimate, cov);
        estimate = result.estimate;
        cov = result.errorCovariance;
      }

      // Smoothed estimate should converge close to -65 dBm from -80 dBm
      expect(estimate).toBeGreaterThan(-67);
      expect(estimate).toBeLessThan(-63);
      expect(cov).toBeLessThan(1.0); // Covariance shrinks as confidence increases
    });
  });

  describe("Log-Distance Path Loss Model", () => {
    it("computes 1 meter distance at reference TxPower (-59 dBm)", () => {
      const dist = TrilaterationEngine.rssiToDistance(-59, -59, 3.0, 0);
      expect(dist).toBeCloseTo(1.0, 1);
    });

    it("computes greater distances as RSSI drops", () => {
      const distNear = TrilaterationEngine.rssiToDistance(-65, -59, 3.0, 0);
      const distFar = TrilaterationEngine.rssiToDistance(-80, -59, 3.0, 0);
      expect(distFar).toBeGreaterThan(distNear);
    });

    it("accounts for wall attenuation correctly", () => {
      const distNoWall = TrilaterationEngine.rssiToDistance(-75, -59, 3.0, 0);
      const distWithWall = TrilaterationEngine.rssiToDistance(-75, -59, 3.0, 6.0); // 6dB wall
      // If a wall absorbs 6dB, the actual physical distance is shorter
      expect(distWithWall).toBeLessThan(distNoWall);
    });
  });

  describe("Multi-Anchor Trilateration (WLS)", () => {
    it("calculates accurate 2D position with 3 anchors within 1.5m tolerance", () => {
      // Setup 3 anchors around true point (10, 10)
      // d1 = sqrt((10-0)^2 + (10-0)^2) = 14.14m -> RSSI = -59 - (10 * 3.0 * log10(14.14)) = -93.5 dBm
      // d2 = sqrt((10-20)^2 + (10-0)^2) = 14.14m -> RSSI = -93.5 dBm
      // d3 = sqrt((10-10)^2 + (10-20)^2) = 10.0m -> RSSI = -59 - (10 * 3.0 * log10(10.0)) = -89.0 dBm
      const anchors: AnchorObservation[] = [
        {
          anchorId: "anc_1",
          coordinates: { x: 0, y: 0 },
          rssi: -93.5,
          txPower1m: -59,
          pathLossExponent: 3.0,
        },
        {
          anchorId: "anc_2",
          coordinates: { x: 20, y: 0 },
          rssi: -93.5,
          txPower1m: -59,
          pathLossExponent: 3.0,
        },
        {
          anchorId: "anc_3",
          coordinates: { x: 10, y: 20 },
          rssi: -89.0,
          txPower1m: -59,
          pathLossExponent: 3.0,
        },
      ];

      const est = TrilaterationEngine.calculatePosition(anchors);

      expect(est.method).toBe("wls_trilateration");
      expect(est.anchorCount).toBe(3);
      // Verify estimated position is near (10, 10)
      expect(Math.abs(est.coordinates.x - 10)).toBeLessThanOrEqual(1.5);
      expect(Math.abs(est.coordinates.y - 10)).toBeLessThanOrEqual(1.5);
    });

    it("gracefully falls back to weighted centroid when anchors are collinear", () => {
      const collinearAnchors: AnchorObservation[] = [
        { anchorId: "anc_1", coordinates: { x: 0, y: 0 }, rssi: -65 },
        { anchorId: "anc_2", coordinates: { x: 10, y: 0 }, rssi: -60 },
        { anchorId: "anc_3", coordinates: { x: 20, y: 0 }, rssi: -65 },
      ];

      const est = TrilaterationEngine.calculatePosition(collinearAnchors);
      expect(est.method).toBe("weighted_centroid");
      expect(est.coordinates.x).toBeCloseTo(10, 1);
    });
  });
});
