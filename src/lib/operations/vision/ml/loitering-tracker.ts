export interface LoiteringTrackState {
  trackId: string;
  cameraId: string;
  zoneId: string;
  firstSeenTimestamp: number;
  lastSeenTimestamp: number;
  initialPosition: { x: number; y: number };
  currentPosition: { x: number; y: number };
  isLoiteringAlertEmitted: boolean;
}

export class LoiteringTracker {
  private activeTracks: Map<string, LoiteringTrackState> = new Map();

  public updateTrack(
    trackId: string,
    cameraId: string,
    zoneId: string,
    position: { x: number; y: number },
    thresholdSeconds: number = 120
  ): { isLoitering: boolean; durationSeconds: number } {
    const key = `${cameraId}:${zoneId}:${trackId}`;
    const now = Date.now();

    let track = this.activeTracks.get(key);
    if (!track) {
      track = {
        trackId,
        cameraId,
        zoneId,
        firstSeenTimestamp: now,
        lastSeenTimestamp: now,
        initialPosition: position,
        currentPosition: position,
        isLoiteringAlertEmitted: false,
      };
      this.activeTracks.set(key, track);
      return { isLoitering: false, durationSeconds: 0 };
    }

    track.lastSeenTimestamp = now;
    track.currentPosition = position;

    // Check displacement: if person moved within 50px radius for > threshold
    const dx = position.x - track.initialPosition.x;
    const dy = position.y - track.initialPosition.y;
    const displacement = Math.sqrt(dx * dx + dy * dy);

    const durationSeconds = Math.floor((now - track.firstSeenTimestamp) / 1000);

    if (displacement > 150) {
      // Person moved significantly, reset base position
      track.firstSeenTimestamp = now;
      track.initialPosition = position;
      return { isLoitering: false, durationSeconds: 0 };
    }

    const isLoitering = durationSeconds >= thresholdSeconds;
    if (isLoitering) {
      track.isLoiteringAlertEmitted = true;
    }

    return { isLoitering, durationSeconds };
  }

  public pruneStaleTracks(maxAgeMs: number = 30000): void {
    const now = Date.now();
    for (const [k, v] of this.activeTracks.entries()) {
      if (now - v.lastSeenTimestamp > maxAgeMs) {
        this.activeTracks.delete(k);
      }
    }
  }
}
