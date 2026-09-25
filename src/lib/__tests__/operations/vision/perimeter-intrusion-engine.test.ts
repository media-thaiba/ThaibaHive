import { PerimeterIntrusionEngine } from '../../../operations/vision/ml/perimeter-intrusion-engine';

describe('PerimeterIntrusionEngine Directional Tripwire Geometry', () => {
  let engine: PerimeterIntrusionEngine;

  beforeEach(() => {
    engine = new PerimeterIntrusionEngine();
    // Register horizontal perimeter tripwire along Y=100 from X=0 to X=500
    engine.registerZone({
      zoneId: 'zone_north_fence',
      cameraId: 'cam_fence_01',
      name: 'North Fence Line',
      tripwire: { p1: { x: 0, y: 100 }, p2: { x: 500, y: 100 } },
      allowedDirection: 'bidirectional',
      sensitivity: 0.9,
    });
  });

  it('should detect when an individual crosses the tripwire', () => {
    // Movement from (150, 80) to (150, 120) crosses Y=100
    const event = engine.evaluateMovement(
      'zone_north_fence',
      'track_intruder_01',
      { x: 150, y: 80 },
      { x: 150, y: 120 }
    );

    expect(event).not.toBeNull();
    expect(event?.trackId).toBe('track_intruder_01');
    expect(event?.crossingPoint.x).toBe(150);
    expect(event?.crossingPoint.y).toBe(100);
  });

  it('should ignore movement that does not cross the tripwire line', () => {
    // Movement from (150, 40) to (150, 80) does NOT cross Y=100
    const event = engine.evaluateMovement(
      'zone_north_fence',
      'track_passerby_01',
      { x: 150, y: 40 },
      { x: 150, y: 80 }
    );

    expect(event).toBeNull();
  });
});
