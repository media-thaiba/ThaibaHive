import { ThreatSeverity, ThreatType } from '../vision-types';

export interface ThreatScoringInput {
  threatType: ThreatType;
  confidenceScore: number;
  isAfterHours?: boolean;
  crowdPresent?: boolean;
  isHighSecurityZone?: boolean;
  repeatIncidentCount?: number;
}

export class ThreatScoringMatrix {
  private static baseWeights: Record<ThreatType, number> = {
    perimeter_intrusion: 0.75,
    crowd_surge: 0.85,
    stampede_risk: 0.95,
    slip_and_fall: 0.80,
    loitering: 0.40,
    camera_tampering: 0.85,
    blacklisted_vehicle: 0.90,
    unresponsive_person: 0.90,
  };

  public static calculateThreatScore(input: ThreatScoringInput): {
    score: number;
    severity: ThreatSeverity;
  } {
    let score = this.baseWeights[input.threatType] * input.confidenceScore;

    if (input.isAfterHours) score += 0.15;
    if (input.isHighSecurityZone) score += 0.20;
    if (input.crowdPresent && (input.threatType === 'crowd_surge' || input.threatType === 'stampede_risk')) {
      score += 0.15;
    }
    if (input.repeatIncidentCount && input.repeatIncidentCount > 1) {
      score += Math.min(input.repeatIncidentCount * 0.05, 0.20);
    }

    score = Math.min(Math.max(score, 0), 1.0);

    let severity: ThreatSeverity = 'informational';
    if (score >= 0.85) {
      severity = 'critical';
    } else if (score >= 0.65) {
      severity = 'high';
    } else if (score >= 0.45) {
      severity = 'medium';
    } else if (score >= 0.25) {
      severity = 'low';
    }

    return { score: Number(score.toFixed(3)), severity };
  }
}
