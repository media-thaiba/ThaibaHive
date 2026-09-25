import { DensityEstimator } from './density-estimator';
import { LoiteringTracker } from './loitering-tracker';
import { CrowdDensityMetric } from '../vision-types';

export interface CrowdFrameAnalysisInput {
  zoneId: string;
  cameraId: string;
  areaSquareMeters: number;
  detections: { trackId: string; x: number; y: number; vx?: number; vy?: number }[];
  loiteringThresholdSeconds?: number;
}

export interface CrowdAnalysisResult {
  metric: CrowdDensityMetric;
  alerts: {
    threatType: 'crowd_surge' | 'stampede_risk' | 'loitering';
    severity: 'critical' | 'high' | 'medium';
    description: string;
  }[];
}

export class CrowdAnomalyDetector {
  private loiteringTracker: LoiteringTracker;

  constructor(loiteringTracker?: LoiteringTracker) {
    this.loiteringTracker = loiteringTracker || new LoiteringTracker();
  }

  public analyzeCrowd(input: CrowdFrameAnalysisInput): CrowdAnalysisResult {
    const personCount = input.detections.length;
    const { densityPersonsPerSqMeter, densityLevel } = DensityEstimator.calculateDensity(
      personCount,
      input.areaSquareMeters
    );

    const velocityVectors = input.detections
      .filter((d) => d.vx !== undefined && d.vy !== undefined)
      .map((d) => ({ vx: d.vx!, vy: d.vy! }));

    const turbulenceIndex = DensityEstimator.calculateTurbulenceIndex(velocityVectors);

    // Crush risk score calculation (Density * Turbulence index * 0.5)
    const crushRiskScore = Number(
      Math.min(1.0, (densityPersonsPerSqMeter / 4.0) * 0.7 + turbulenceIndex * 0.3).toFixed(3)
    );

    const alerts: CrowdAnalysisResult['alerts'] = [];

    if (densityLevel === 'critical_crush' || crushRiskScore >= 0.85) {
      alerts.push({
        threatType: 'stampede_risk',
        severity: 'critical',
        description: `Dangerous crowd crush risk detected in zone ${input.zoneId}: density ${densityPersonsPerSqMeter} p/m2, turbulence ${turbulenceIndex}`,
      });
    } else if (densityLevel === 'high' || turbulenceIndex > 0.6) {
      alerts.push({
        threatType: 'crowd_surge',
        severity: 'high',
        description: `Elevated crowd surge in zone ${input.zoneId}: density ${densityPersonsPerSqMeter} p/m2`,
      });
    }

    // Check loitering for individual tracks
    for (const d of input.detections) {
      const { isLoitering, durationSeconds } = this.loiteringTracker.updateTrack(
        d.trackId,
        input.cameraId,
        input.zoneId,
        { x: d.x, y: d.y },
        input.loiteringThresholdSeconds || 120
      );

      if (isLoitering) {
        alerts.push({
          threatType: 'loitering',
          severity: 'medium',
          description: `Loitering detected for track ${d.trackId} in zone ${input.zoneId} for ${durationSeconds}s`,
        });
      }
    }

    const metric: CrowdDensityMetric = {
      zoneId: input.zoneId,
      cameraId: input.cameraId,
      personCount,
      densityPersonsPerSqMeter,
      velocityVector: velocityVectors.length > 0
        ? {
            vx: Number((velocityVectors.reduce((a, b) => a + b.vx, 0) / velocityVectors.length).toFixed(2)),
            vy: Number((velocityVectors.reduce((a, b) => a + b.vy, 0) / velocityVectors.length).toFixed(2)),
          }
        : { vx: 0, vy: 0 },
      turbulenceIndex,
      crushRiskScore,
      timestamp: new Date().toISOString(),
    };

    return { metric, alerts };
  }

  public getLoiteringTracker(): LoiteringTracker {
    return this.loiteringTracker;
  }
}
