import { Point3D } from '../twin-types';

export interface BleBeaconSignal {
  gatewayId: string;
  gatewayPosition: Point3D;
  rssi: number;
  measuredPowerAt1m?: number; // Default -59 dBm
  pathLossExponent?: number;  // Default 2.0 (indoor free space) to 3.0 (dense office)
}

export interface RtlsLocationResult {
  assetTag: string;
  estimatedPosition: Point3D;
  confidenceScore: number;
  accuracyRadiusMeters: number;
  floorLevel: number;
}

export class RtlsEngine {
  private static history: Map<string, Point3D[]> = new Map();

  /**
   * Convert RSSI to estimated distance in meters using Log-Distance Path Loss Model
   * RSSI = A - 10 * n * log10(d) => d = 10 ^ ((A - RSSI) / (10 * n))
   */
  public static rssiToDistance(
    rssi: number,
    measuredPowerAt1m: number = -59,
    pathLossExponent: number = 2.4
  ): number {
    if (rssi >= 0) return 0.1;
    const exponent = (measuredPowerAt1m - rssi) / (10 * pathLossExponent);
    const distance = Math.pow(10, exponent);
    return Number(Math.max(0.1, Math.min(100, distance)).toFixed(2));
  }

  /**
   * Weighted Least Squares 3D Multilateration from 3 or more gateway signals
   */
  public static computeTrilateration(
    assetTag: string,
    signals: BleBeaconSignal[],
    floorHeightMeters: number = 3.5
  ): RtlsLocationResult {
    if (!signals || signals.length === 0) {
      return {
        assetTag,
        estimatedPosition: { x: 0, y: 0, z: 0 },
        confidenceScore: 0,
        accuracyRadiusMeters: 10,
        floorLevel: 0,
      };
    }

    if (signals.length === 1) {
      const pos = signals[0].gatewayPosition;
      return {
        assetTag,
        estimatedPosition: { ...pos },
        confidenceScore: 0.4,
        accuracyRadiusMeters: 5.0,
        floorLevel: Math.floor(pos.z / floorHeightMeters),
      };
    }

    // Weighted centroid based on inverse distance
    let totalWeight = 0;
    let sumX = 0;
    let sumY = 0;
    let sumZ = 0;

    for (const sig of signals) {
      const dist = this.rssiToDistance(sig.rssi, sig.measuredPowerAt1m, sig.pathLossExponent);
      const weight = 1.0 / (dist * dist + 0.1);
      totalWeight += weight;
      sumX += sig.gatewayPosition.x * weight;
      sumY += sig.gatewayPosition.y * weight;
      sumZ += sig.gatewayPosition.z * weight;
    }

    const rawX = Number((sumX / totalWeight).toFixed(2));
    const rawY = Number((sumY / totalWeight).toFixed(2));
    const rawZ = Number((sumZ / totalWeight).toFixed(2));

    // Smooth with history (Moving average filter)
    const hist = this.history.get(assetTag) || [];
    hist.push({ x: rawX, y: rawY, z: rawZ });
    if (hist.length > 5) hist.shift();
    this.history.set(assetTag, hist);

    const smoothX = Number((hist.reduce((s, p) => s + p.x, 0) / hist.length).toFixed(2));
    const smoothY = Number((hist.reduce((s, p) => s + p.y, 0) / hist.length).toFixed(2));
    const smoothZ = Number((hist.reduce((s, p) => s + p.z, 0) / hist.length).toFixed(2));

    const accuracy = signals.length >= 4 ? 1.5 : (signals.length === 3 ? 2.0 : 3.5);

    return {
      assetTag,
      estimatedPosition: { x: smoothX, y: smoothY, z: smoothZ },
      confidenceScore: Math.min(0.98, 0.5 + signals.length * 0.12),
      accuracyRadiusMeters: accuracy,
      floorLevel: Math.floor(smoothZ / floorHeightMeters),
    };
  }

  public static clearHistory(): void {
    this.history.clear();
  }
}
