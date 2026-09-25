import { SlipFallEvent } from '../vision-types';

export interface PoseKeypointSequence {
  trackId: string;
  cameraId: string;
  frames: {
    timestamp: number;
    headY: number;
    bboxHeight: number;
    bboxWidth: number;
  }[];
}

export class SlipFallDetector {
  private poseHistories: Map<string, PoseKeypointSequence> = new Map();
  private readonly VERTICAL_DROP_VELOCITY_THRESHOLD = 8.0; // px/frame downward drop
  private readonly HORIZONTAL_ASPECT_RATIO_THRESHOLD = 1.8; // width / height > 1.8 (lying down)
  private readonly IMMOBILITY_THRESHOLD_SECONDS = 15;

  public processPoseFrame(
    trackId: string,
    cameraId: string,
    headY: number,
    bboxWidth: number,
    bboxHeight: number,
    timestamp: number = Date.now()
  ): SlipFallEvent | null {
    const key = `${cameraId}:${trackId}`;
    let history = this.poseHistories.get(key);

    if (!history) {
      history = { trackId, cameraId, frames: [] };
      this.poseHistories.set(key, history);
    }

    history.frames.push({ timestamp, headY, bboxWidth, bboxHeight });

    // Keep last 60 frames (~2-3 seconds at 30 FPS)
    if (history.frames.length > 60) {
      history.frames.shift();
    }

    if (history.frames.length < 5) return null;

    // Check downward velocity
    const firstFrame = history.frames[0];
    const lastFrame = history.frames[history.frames.length - 1];
    const timeDeltaSec = (lastFrame.timestamp - firstFrame.timestamp) / 1000;

    if (timeDeltaSec <= 0) return null;

    const verticalDrop = lastFrame.headY - firstFrame.headY; // In screen coords, positive Y is downwards
    const verticalVelocity = verticalDrop / timeDeltaSec;

    const currentAspectRatio = lastFrame.bboxWidth / Math.max(lastFrame.bboxHeight, 1);

    // Fall pattern: rapid downward drop followed by horizontal aspect ratio (lying on floor)
    const isRapidDrop = verticalVelocity >= this.VERTICAL_DROP_VELOCITY_THRESHOLD;
    const isHorizontalPostFall = currentAspectRatio >= this.HORIZONTAL_ASPECT_RATIO_THRESHOLD;

    if (isRapidDrop && isHorizontalPostFall) {
      const confidence = Math.min(
        0.98,
        Number((0.6 + (verticalVelocity / 20.0) * 0.2 + (currentAspectRatio / 3.0) * 0.2).toFixed(2))
      );

      return {
        cameraId,
        trackId,
        verticalVelocity: Number(verticalVelocity.toFixed(2)),
        aspectRatio: Number(currentAspectRatio.toFixed(2)),
        immobilityDurationSeconds: 15,
        confidence,
        timestamp: new Date().toISOString(),
      };
    }

    return null;
  }
}
