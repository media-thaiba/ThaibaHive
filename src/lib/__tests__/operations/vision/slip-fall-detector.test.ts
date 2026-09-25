import { SlipFallDetector } from '../../../operations/vision/ml/slip-fall-detector';

describe('SlipFallDetector Human Pose Fall Detection', () => {
  let detector: SlipFallDetector;

  beforeEach(() => {
    detector = new SlipFallDetector();
  });

  it('should detect a slip-and-fall event when downward drop velocity and horizontal ratio are met', () => {
    const baseTime = 1000000;
    // Frame 1: Standing person (head at y=50, w=40, h=150)
    detector.processPoseFrame('person_1', 'cam_corridor_01', 50, 40, 150, baseTime);
    detector.processPoseFrame('person_1', 'cam_corridor_01', 70, 45, 140, baseTime + 100);
    detector.processPoseFrame('person_1', 'cam_corridor_01', 120, 70, 100, baseTime + 200);
    detector.processPoseFrame('person_1', 'cam_corridor_01', 200, 120, 60, baseTime + 300);
    // Frame 5: Person lying on floor (head at y=280, w=160, h=50 -> aspect ratio 3.2)
    const fallEvent = detector.processPoseFrame('person_1', 'cam_corridor_01', 280, 160, 50, baseTime + 400);

    expect(fallEvent).not.toBeNull();
    expect(fallEvent?.trackId).toBe('person_1');
    expect(fallEvent?.aspectRatio).toBeGreaterThanOrEqual(1.8);
    expect(fallEvent?.confidence).toBeGreaterThanOrEqual(0.85);
  });

  it('should not trigger fall alert for a normal walking person', () => {
    const baseTime = 1000000;
    detector.processPoseFrame('person_2', 'cam_corridor_01', 50, 40, 150, baseTime);
    detector.processPoseFrame('person_2', 'cam_corridor_01', 51, 40, 150, baseTime + 100);
    detector.processPoseFrame('person_2', 'cam_corridor_01', 50, 40, 150, baseTime + 200);
    detector.processPoseFrame('person_2', 'cam_corridor_01', 52, 40, 150, baseTime + 300);
    const fallEvent = detector.processPoseFrame('person_2', 'cam_corridor_01', 51, 40, 150, baseTime + 400);

    expect(fallEvent).toBeNull();
  });
});
