import { InferenceScheduler } from './inference-scheduler';

export interface BoundingBoxDetection {
  trackId: string;
  classLabel: 'person' | 'vehicle' | 'backpack' | 'bicycle';
  confidence: number;
  bbox: { x: number; y: number; width: number; height: number };
  velocity?: { vx: number; vy: number };
}

export interface FrameMetadataPayload {
  frameId: string;
  cameraId: string;
  timestamp: string;
  fps: number;
  detections: BoundingBoxDetection[];
  institutionId?: string;
}

export class FrameMetadataIngester {
  private scheduler: InferenceScheduler;
  private trackedObjects: Map<string, { lastSeen: number; detections: BoundingBoxDetection[] }> = new Map();

  constructor(scheduler?: InferenceScheduler) {
    this.scheduler = scheduler || new InferenceScheduler();
  }

  public ingestFrame(frame: FrameMetadataPayload): {
    processedCount: number;
    anomalyTriggered: boolean;
    activeTrackCount: number;
  } {
    const now = Date.now();
    let anomalyTriggered = false;

    for (const det of frame.detections) {
      const trackKey = `${frame.cameraId}:${det.trackId}`;
      let trackHistory = this.trackedObjects.get(trackKey);
      if (!trackHistory) {
        trackHistory = { lastSeen: now, detections: [] };
        this.trackedObjects.set(trackKey, trackHistory);
      }
      trackHistory.lastSeen = now;
      trackHistory.detections.push(det);

      // Keep only last 30 frames of track history
      if (trackHistory.detections.length > 30) {
        trackHistory.detections.shift();
      }

      // Check if velocity surge or high object density triggers anomaly
      if (det.velocity && (Math.abs(det.velocity.vx) > 5.0 || Math.abs(det.velocity.vy) > 5.0)) {
        this.scheduler.triggerAnomalyBurst(frame.cameraId);
        anomalyTriggered = true;
      }
    }

    // Prune stale tracks (> 10s old)
    for (const [key, val] of this.trackedObjects.entries()) {
      if (now - val.lastSeen > 10000) {
        this.trackedObjects.delete(key);
      }
    }

    return {
      processedCount: frame.detections.length,
      anomalyTriggered,
      activeTrackCount: this.trackedObjects.size,
    };
  }

  public getTrackHistory(cameraId: string, trackId: string): BoundingBoxDetection[] {
    const trackKey = `${cameraId}:${trackId}`;
    return this.trackedObjects.get(trackKey)?.detections || [];
  }

  public getScheduler(): InferenceScheduler {
    return this.scheduler;
  }
}
