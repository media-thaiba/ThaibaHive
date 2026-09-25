/**
 * Power Quality Monitor
 * Analyzes voltage, frequency, power factor, and harmonic parameters
 */

export interface PowerQualityReading {
  assetId: string;
  nominalVoltage: number;
  voltageV: number;
  nominalFrequency: number;
  frequencyHz: number;
  currentPhaseA?: number;
  currentPhaseB?: number;
  currentPhaseC?: number;
  powerFactor: number;
  thdPercent?: number; // Total harmonic distortion
  timestamp: string;
}

export interface PowerQualityIssue {
  issueId: string;
  assetId: string;
  issueType: 'voltage_sag' | 'voltage_swell' | 'frequency_deviation' | 'low_power_factor' | 'phase_imbalance' | 'high_thd';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  measuredValue: number;
  threshold: number;
  recommendedAction: string;
  timestamp: string;
}

export class PowerQualityMonitor {
  /**
   * Evaluate power quality parameters and detect violations
   */
  public static analyzeReading(reading: PowerQualityReading): PowerQualityIssue[] {
    const issues: PowerQualityIssue[] = [];
    const now = reading.timestamp || new Date().toISOString();

    // 1. Voltage Sag / Swell Check (±10% nominal)
    const nominalV = reading.nominalVoltage || 400.0;
    const vLowerBound = nominalV * 0.90;
    const vUpperBound = nominalV * 1.10;

    if (reading.voltageV < vLowerBound) {
      const dropPercent = ((nominalV - reading.voltageV) / nominalV) * 100;
      issues.push({
        issueId: `pq_sag_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
        assetId: reading.assetId,
        issueType: 'voltage_sag',
        severity: dropPercent > 20 ? 'critical' : 'high',
        description: `Voltage sag detected: ${reading.voltageV}V is ${dropPercent.toFixed(1)}% below nominal ${nominalV}V`,
        measuredValue: reading.voltageV,
        threshold: vLowerBound,
        recommendedAction: 'Engage voltage regulator or step-up transformer tap changer; check upstream grid supply.',
        timestamp: now,
      });
    } else if (reading.voltageV > vUpperBound) {
      const risePercent = ((reading.voltageV - nominalV) / nominalV) * 100;
      issues.push({
        issueId: `pq_swell_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
        assetId: reading.assetId,
        issueType: 'voltage_swell',
        severity: risePercent > 20 ? 'critical' : 'high',
        description: `Voltage swell detected: ${reading.voltageV}V is ${risePercent.toFixed(1)}% above nominal ${nominalV}V`,
        measuredValue: reading.voltageV,
        threshold: vUpperBound,
        recommendedAction: 'Curtail over-generating solar inverters or adjust capacitor bank setpoint.',
        timestamp: now,
      });
    }

    // 2. Frequency Deviation Check (±0.5 Hz)
    const nominalFreq = reading.nominalFrequency || 50.0;
    const freqDelta = Math.abs(reading.frequencyHz - nominalFreq);
    if (freqDelta > 0.5) {
      issues.push({
        issueId: `pq_freq_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
        assetId: reading.assetId,
        issueType: 'frequency_deviation',
        severity: freqDelta > 1.5 ? 'critical' : 'high',
        description: `Grid frequency excursion: ${reading.frequencyHz}Hz deviates by ${freqDelta.toFixed(2)}Hz from nominal ${nominalFreq}Hz`,
        measuredValue: reading.frequencyHz,
        threshold: 0.5,
        recommendedAction: 'Trigger autonomous BESS fast frequency response (FFR) support.',
        timestamp: now,
      });
    }

    // 3. Low Power Factor Check (PF < 0.85)
    if (reading.powerFactor < 0.85 && reading.powerFactor > 0) {
      issues.push({
        issueId: `pq_pf_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
        assetId: reading.assetId,
        issueType: 'low_power_factor',
        severity: reading.powerFactor < 0.75 ? 'high' : 'medium',
        description: `Poor power factor: ${reading.powerFactor} below minimum utility penalty threshold 0.85`,
        measuredValue: reading.powerFactor,
        threshold: 0.85,
        recommendedAction: 'Engage automatic power factor correction (APFC) capacitor bank.',
        timestamp: now,
      });
    }

    // 4. 3-Phase Current Imbalance Check (> 10%)
    if (
      reading.currentPhaseA !== undefined &&
      reading.currentPhaseB !== undefined &&
      reading.currentPhaseC !== undefined
    ) {
      const avgCurrent = (reading.currentPhaseA + reading.currentPhaseB + reading.currentPhaseC) / 3;
      if (avgCurrent > 5) {
        const maxDev = Math.max(
          Math.abs(reading.currentPhaseA - avgCurrent),
          Math.abs(reading.currentPhaseB - avgCurrent),
          Math.abs(reading.currentPhaseC - avgCurrent)
        );
        const unbalancePercent = (maxDev / avgCurrent) * 100;
        if (unbalancePercent > 10) {
          issues.push({
            issueId: `pq_unbal_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
            assetId: reading.assetId,
            issueType: 'phase_imbalance',
            severity: unbalancePercent > 20 ? 'high' : 'medium',
            description: `3-phase current imbalance: ${unbalancePercent.toFixed(1)}% exceeds 10% limit`,
            measuredValue: Number(unbalancePercent.toFixed(1)),
            threshold: 10,
            recommendedAction: 'Redistribute single-phase building loads across phases L1, L2, L3.',
            timestamp: now,
          });
        }
      }
    }

    // 5. Total Harmonic Distortion (THD > 5%)
    if (reading.thdPercent !== undefined && reading.thdPercent > 5.0) {
      issues.push({
        issueId: `pq_thd_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
        assetId: reading.assetId,
        issueType: 'high_thd',
        severity: reading.thdPercent > 10.0 ? 'high' : 'medium',
        description: `Total harmonic distortion: ${reading.thdPercent}% exceeds IEEE 519 5% guideline`,
        measuredValue: reading.thdPercent,
        threshold: 5.0,
        recommendedAction: 'Inspect non-linear loads and activate active harmonic filter (AHF).',
        timestamp: now,
      });
    }

    return issues;
  }
}
