export interface AnchorObservation {
  anchorId: string;
  coordinates: { x: number; y: number; z?: number };
  rssi: number;
  txPower1m?: number; // Default -59 dBm
  pathLossExponent?: number; // n in [2.0, 4.2], default 3.0
  wallAttenuationDb?: number; // default 0 dB
}

export interface EstimatedPosition {
  coordinates: { x: number; y: number; z?: number };
  accuracyMeters: number;
  anchorCount: number;
  method: "wls_trilateration" | "weighted_centroid" | "single_anchor_proximity";
}

export class TrilaterationEngine {
  /**
   * 1. 5-sample Rolling Median Filter to reject multipath spikes
   */
  static rollingMedian(samples: number[]): number {
    if (samples.length === 0) return -100;
    if (samples.length === 1) return samples[0];

    const sorted = [...samples].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    if (sorted.length % 2 === 0) {
      return (sorted[mid - 1] + sorted[mid]) / 2;
    }
    return sorted[mid];
  }

  /**
   * 2. 1D Kalman Filter for single-channel RSSI smoothing
   */
  static smoothRssiKalman(
    rawRssi: number,
    previousEstimate = rawRssi,
    previousErrorCovariance = 1.0,
    processNoise = 0.05,
    measurementNoise = 1.5
  ): { estimate: number; errorCovariance: number } {
    // Prediction step
    const priorEstimate = previousEstimate;
    const priorCovariance = previousErrorCovariance + processNoise;

    // Measurement update step
    const kalmanGain = priorCovariance / (priorCovariance + measurementNoise);
    const estimate = priorEstimate + kalmanGain * (rawRssi - priorEstimate);
    const errorCovariance = (1 - kalmanGain) * priorCovariance;

    return { estimate, errorCovariance };
  }

  /**
   * 3. Log-Distance Path Loss Model to compute distance from smoothed RSSI
   * d = 10^((TxPower - RSSI - wallAttenuation) / (10 * n))
   */
  static rssiToDistance(
    rssi: number,
    txPower1m = -59,
    pathLossExponent = 3.0,
    wallAttenuationDb = 0
  ): number {
    const effectiveRssi = rssi + wallAttenuationDb;
    const exponent = (txPower1m - effectiveRssi) / (10 * pathLossExponent);
    const distance = Math.pow(10, exponent);
    // Clamp to realistic physical range [0.1m, 100m]
    return Math.max(0.1, Math.min(100.0, distance));
  }

  /**
   * 4. Multi-Anchor Trilateration with Weighted Least Squares (WLS)
   */
  static calculatePosition(observations: AnchorObservation[]): EstimatedPosition {
    if (observations.length === 0) {
      return {
        coordinates: { x: 0, y: 0 },
        accuracyMeters: 999,
        anchorCount: 0,
        method: "weighted_centroid",
      };
    }

    if (observations.length === 1) {
      const obs = observations[0];
      const dist = this.rssiToDistance(
        obs.rssi,
        obs.txPower1m ?? -59,
        obs.pathLossExponent ?? 3.0,
        obs.wallAttenuationDb ?? 0
      );
      return {
        coordinates: { x: obs.coordinates.x, y: obs.coordinates.y },
        accuracyMeters: dist,
        anchorCount: 1,
        method: "single_anchor_proximity",
      };
    }

    // Process anchors and calculate estimated distances
    const anchorsWithDist = observations.map((obs) => {
      const dist = this.rssiToDistance(
        obs.rssi,
        obs.txPower1m ?? -59,
        obs.pathLossExponent ?? 3.0,
        obs.wallAttenuationDb ?? 0
      );
      return {
        x: obs.coordinates.x,
        y: obs.coordinates.y,
        d: dist,
        weight: 1.0 / (dist * dist), // Higher weight for closer anchors
      };
    });

    if (anchorsWithDist.length === 2) {
      // 2 anchors -> weighted linear interpolation
      const totalWeight = anchorsWithDist[0].weight + anchorsWithDist[1].weight;
      const x =
        (anchorsWithDist[0].x * anchorsWithDist[0].weight +
          anchorsWithDist[1].x * anchorsWithDist[1].weight) /
        totalWeight;
      const y =
        (anchorsWithDist[0].y * anchorsWithDist[0].weight +
          anchorsWithDist[1].y * anchorsWithDist[1].weight) /
        totalWeight;

      return {
        coordinates: { x, y },
        accuracyMeters: Math.min(anchorsWithDist[0].d, anchorsWithDist[1].d),
        anchorCount: 2,
        method: "weighted_centroid",
      };
    }

    // 3+ Anchors: Full Weighted Least Squares (WLS)
    try {
      const p1 = anchorsWithDist[0];
      const n = anchorsWithDist.length - 1;

      // Matrix A (n x 2) and Vector b (n x 1)
      const A: number[][] = [];
      const b: number[] = [];
      const W: number[] = [];

      for (let i = 1; i <= n; i++) {
        const pi = anchorsWithDist[i];
        const row = [2 * (pi.x - p1.x), 2 * (pi.y - p1.y)];
        const val =
          pi.x * pi.x -
          p1.x * p1.x +
          (pi.y * pi.y - p1.y * p1.y) +
          (p1.d * p1.d - pi.d * pi.d);

        A.push(row);
        b.push(val);
        W.push(pi.weight);
      }

      // Solve (A^T * W * A) * p = A^T * W * b
      let AtWA_00 = 0,
        AtWA_01 = 0,
        AtWA_10 = 0,
        AtWA_11 = 0;
      let AtWb_0 = 0,
        AtWb_1 = 0;

      for (let i = 0; i < n; i++) {
        const w = W[i];
        const a0 = A[i][0];
        const a1 = A[i][1];
        const bi = b[i];

        AtWA_00 += a0 * w * a0;
        AtWA_01 += a0 * w * a1;
        AtWA_10 += a1 * w * a0;
        AtWA_11 += a1 * w * a1;

        AtWb_0 += a0 * w * bi;
        AtWb_1 += a1 * w * bi;
      }

      const det = AtWA_00 * AtWA_11 - AtWA_01 * AtWA_10;

      // Geometric Dilution of Precision (GDOP) check: if collinear or near-singular, fallback
      if (Math.abs(det) < 1e-4) {
        return this.fallbackWeightedCentroid(anchorsWithDist);
      }

      const inv_00 = AtWA_11 / det;
      const inv_01 = -AtWA_01 / det;
      const inv_10 = -AtWA_10 / det;
      const inv_11 = AtWA_00 / det;

      const posX = inv_00 * AtWb_0 + inv_01 * AtWb_1;
      const posY = inv_10 * AtWb_0 + inv_11 * AtWb_1;

      // Compute estimated accuracy tolerance
      const avgDistance =
        anchorsWithDist.reduce((acc, curr) => acc + curr.d, 0) /
        anchorsWithDist.length;

      return {
        coordinates: {
          x: Math.round(posX * 100) / 100,
          y: Math.round(posY * 100) / 100,
        },
        accuracyMeters: Math.round(avgDistance * 0.25 * 100) / 100, // typically ~25% of anchor distance
        anchorCount: anchorsWithDist.length,
        method: "wls_trilateration",
      };
    } catch {
      return this.fallbackWeightedCentroid(anchorsWithDist);
    }
  }

  private static fallbackWeightedCentroid(
    anchors: Array<{ x: number; y: number; d: number; weight: number }>
  ): EstimatedPosition {
    let sumWeight = 0;
    let sumX = 0;
    let sumY = 0;

    for (const a of anchors) {
      sumWeight += a.weight;
      sumX += a.x * a.weight;
      sumY += a.y * a.weight;
    }

    return {
      coordinates: {
        x: Math.round((sumX / sumWeight) * 100) / 100,
        y: Math.round((sumY / sumWeight) * 100) / 100,
      },
      accuracyMeters: Math.round((anchors[0]?.d || 5.0) * 100) / 100,
      anchorCount: anchors.length,
      method: "weighted_centroid",
    };
  }
}
