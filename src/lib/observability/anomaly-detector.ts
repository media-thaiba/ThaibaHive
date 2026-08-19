import { EventBus } from "./event-bus";

export class AnomalyDetector {
  private latencies: number[] = [];
  private readonly windowSize = 50;

  private compressionRatios: number[] = [];

  recordLatency(value: number) {
    this.latencies.push(value);
    if (this.latencies.length > this.windowSize) {
      this.latencies.shift();
    }

    if (this.latencies.length < 10) {
      return;
    }

    const sum = this.latencies.reduce((a, b) => a + b, 0);
    const avg = sum / this.latencies.length;

    const squareDiffs = this.latencies.map((v) => Math.pow(v - avg, 2));
    const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / this.latencies.length;
    const stdDev = Math.sqrt(avgSquareDiff);

    const threshold = avg + 3 * stdDev;

    if (value > threshold && stdDev > 0.5) {
      EventBus.getInstance().publishEvent({
        eventSource: "anomaly-detector",
        severity: "warning",
        message: `Latency Anomaly Detected: value ${value.toFixed(1)}ms exceeded threshold ${threshold.toFixed(1)}ms`
      });
    }
  }

  recordCompressionRatio(deviceId: string, ratio: number, bandwidthKbps: number) {
    // Flag if compression ratio is below 40% (0.40)
    if (ratio < 0.40) {
      EventBus.getInstance().publishEvent({
        eventSource: "anomaly-detector",
        severity: "warning",
        message: `Low Compression Ratio Anomaly: Device ${deviceId} achieved only ${(ratio * 100).toFixed(1)}% savings (bandwidth: ${bandwidthKbps} Kbps)`
      });
    }

    this.compressionRatios.push(ratio);
    if (this.compressionRatios.length > this.windowSize) {
      this.compressionRatios.shift();
    }

    if (this.compressionRatios.length < 10) {
      return;
    }

    const sum = this.compressionRatios.reduce((a, b) => a + b, 0);
    const avg = sum / this.compressionRatios.length;

    const squareDiffs = this.compressionRatios.map((v) => Math.pow(v - avg, 2));
    const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / this.compressionRatios.length;
    const stdDev = Math.sqrt(avgSquareDiff);

    const thresholdLow = avg - 3 * stdDev;
    const thresholdHigh = avg + 3 * stdDev;

    if ((ratio < thresholdLow || ratio > thresholdHigh) && stdDev > 0.05) {
      EventBus.getInstance().publishEvent({
        eventSource: "anomaly-detector",
        severity: "warning",
        message: `Compression Ratio Deviation: Device ${deviceId} ratio ${ratio.toFixed(2)} deviated from fleet baseline ${avg.toFixed(2)} (stdDev: ${stdDev.toFixed(2)})`
      });
    }
  }

  getBaseline(): { average: number; stdDev: number } {
    if (this.latencies.length === 0) return { average: 0, stdDev: 0 };
    const sum = this.latencies.reduce((a, b) => a + b, 0);
    const avg = sum / this.latencies.length;
    const squareDiffs = this.latencies.map((v) => Math.pow(v - avg, 2));
    const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / this.latencies.length;
    return { average: avg, stdDev: Math.sqrt(avgSquareDiff) };
  }
}
