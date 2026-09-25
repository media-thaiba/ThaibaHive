import { FrameMetadataIngester } from '../../../operations/vision/ingestion/frame-metadata-ingester';
import { InferenceScheduler } from '../../../operations/vision/ingestion/inference-scheduler';

describe('FrameMetadataIngester Object Tracking & Adaptive Inference Scaling', () => {
  let ingester: FrameMetadataIngester;
  let scheduler: InferenceScheduler;

  beforeEach(() => {
    scheduler = new InferenceScheduler();
    scheduler.registerCamera('cam_01', 5, 30);
    ingester = new FrameMetadataIngester(scheduler);
  });

  it('should ingest frame detections and maintain track history', () => {
    const result = ingester.ingestFrame({
      frameId: 'frm_1001',
      cameraId: 'cam_01',
      timestamp: new Date().toISOString(),
      fps: 5,
      detections: [
        {
          trackId: 'trk_01',
          classLabel: 'person',
          confidence: 0.92,
          bbox: { x: 50, y: 100, width: 40, height: 120 },
        },
        {
          trackId: 'trk_02',
          classLabel: 'vehicle',
          confidence: 0.96,
          bbox: { x: 200, y: 300, width: 150, height: 80 },
        },
      ],
    });

    expect(result.processedCount).toBe(2);
    expect(result.activeTrackCount).toBe(2);
    expect(result.anomalyTriggered).toBe(false);

    const history = ingester.getTrackHistory('cam_01', 'trk_01');
    expect(history.length).toBe(1);
    expect(history[0].classLabel).toBe('person');
  });

  it('should trigger 30 FPS anomaly burst upon high velocity movement', () => {
    const initialSchedule = scheduler.getSchedule('cam_01');
    expect(initialSchedule?.currentFps).toBe(5);

    const result = ingester.ingestFrame({
      frameId: 'frm_1002',
      cameraId: 'cam_01',
      timestamp: new Date().toISOString(),
      fps: 5,
      detections: [
        {
          trackId: 'trk_running_person',
          classLabel: 'person',
          confidence: 0.89,
          bbox: { x: 120, y: 180, width: 35, height: 110 },
          velocity: { vx: 6.2, vy: 1.5 }, // High velocity surge > 5.0
        },
      ],
    });

    expect(result.anomalyTriggered).toBe(true);
    const updatedSchedule = scheduler.getSchedule('cam_01');
    expect(updatedSchedule?.currentFps).toBe(30);
    expect(updatedSchedule?.isHighPriority).toBe(true);
  });
});
