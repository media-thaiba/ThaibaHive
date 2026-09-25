import { CrowdAnomalyDetector } from '../../../operations/vision/ml/crowd-anomaly-detector';

describe('CrowdAnomalyDetector Crowd Density & Loitering ML', () => {
  let detector: CrowdAnomalyDetector;

  beforeEach(() => {
    detector = new CrowdAnomalyDetector();
  });

  it('should detect normal flow under low density', () => {
    const result = detector.analyzeCrowd({
      zoneId: 'zone_quad',
      cameraId: 'cam_01',
      areaSquareMeters: 50.0,
      detections: [
        { trackId: 'p1', x: 10, y: 20, vx: 1.2, vy: 0.1 },
        { trackId: 'p2', x: 25, y: 30, vx: 1.1, vy: 0.0 },
      ],
    });

    expect(result.metric.personCount).toBe(2);
    expect(result.metric.densityPersonsPerSqMeter).toBe(0.04);
    expect(result.alerts.length).toBe(0);
    expect(result.metric.crushRiskScore).toBeLessThan(0.3);
  });

  it('should detect stampede / crush risk when density exceeds critical threshold', () => {
    // 50 people in 10 m2 = 5.0 persons/m2 (exceeds critical threshold 4.0)
    const detections = [];
    for (let i = 0; i < 50; i++) {
      detections.push({
        trackId: `p_${i}`,
        x: Math.random() * 100,
        y: Math.random() * 100,
        vx: (Math.random() - 0.5) * 8.0, // High turbulent counter-flow
        vy: (Math.random() - 0.5) * 8.0,
      });
    }

    const result = detector.analyzeCrowd({
      zoneId: 'zone_auditorium_exit',
      cameraId: 'cam_02',
      areaSquareMeters: 10.0,
      detections,
    });

    expect(result.metric.densityPersonsPerSqMeter).toBe(5.0);
    expect(result.alerts.some((a) => a.threatType === 'stampede_risk')).toBe(true);
    expect(result.metric.crushRiskScore).toBeGreaterThanOrEqual(0.8);
  });
});
