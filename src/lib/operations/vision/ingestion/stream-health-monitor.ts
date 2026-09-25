export interface StreamHealthMetrics {
  cameraId: string;
  fps: number;
  bitrateKbps: number;
  packetLossPercent: number;
  latencyMs: number;
  isOccluded: boolean;
  status: 'online' | 'offline' | 'degraded' | 'occluded';
  lastHeartbeat: string;
}

export class StreamHealthMonitor {
  private healthMap: Map<string, StreamHealthMetrics> = new Map();

  public recordHeartbeat(
    cameraId: string,
    fps: number,
    bitrateKbps: number,
    packetLossPercent: number,
    latencyMs: number,
    luminanceVariance?: number
  ): StreamHealthMetrics {
    const isOccluded = luminanceVariance !== undefined && luminanceVariance < 5.0; // Very low variance implies occlusion/covered lens

    let status: StreamHealthMetrics['status'] = 'online';
    if (isOccluded) {
      status = 'occluded';
    } else if (packetLossPercent > 15.0 || fps < 10 || latencyMs > 800) {
      status = 'degraded';
    }

    const metrics: StreamHealthMetrics = {
      cameraId,
      fps,
      bitrateKbps,
      packetLossPercent,
      latencyMs,
      isOccluded,
      status,
      lastHeartbeat: new Date().toISOString(),
    };

    this.healthMap.set(cameraId, metrics);
    return metrics;
  }

  public getCameraHealth(cameraId: string): StreamHealthMetrics | null {
    const metrics = this.healthMap.get(cameraId);
    if (!metrics) return null;

    // Check if stale heartbeat (> 10s)
    const ageMs = Date.now() - new Date(metrics.lastHeartbeat).getTime();
    if (ageMs > 10000) {
      metrics.status = 'offline';
    }
    return metrics;
  }

  public listUnhealthyCameras(): StreamHealthMetrics[] {
    const now = Date.now();
    return Array.from(this.healthMap.values()).filter((m) => {
      const ageMs = now - new Date(m.lastHeartbeat).getTime();
      return m.status !== 'online' || ageMs > 10000;
    });
  }
}
