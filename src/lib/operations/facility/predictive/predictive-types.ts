import { AnomalySeverity, SensorType } from '../facility-types';

export interface AnomalyDetectionResult {
  sensorId: string;
  equipmentId: string;
  sensorType: SensorType;
  currentValue: number;
  expectedValue: number;
  anomalyScore: number; // 0.0 to 1.0
  isAnomaly: boolean;
  severity: AnomalySeverity;
  alertType: string;
  reason: string;
  timestamp: string;
}

export interface FftPeakHarmonic {
  frequencyHz: number;
  amplitude: number;
  harmonicOrder: number;
  faultTag?: string; // 'BPFI' (inner race), 'BPFO' (outer race), 'BSF' (ball spin), 'FTF' (cage), '1X_UNBALANCE', '2X_MISALIGNMENT'
}

export interface VibrationFftResult {
  equipmentId: string;
  sensorId: string;
  dominantFrequencyHz: number;
  peakRms: number;
  harmonicPeaks: FftPeakHarmonic[];
  severity: AnomalySeverity;
  mechanicalFaultDetected: boolean;
  diagnosticNotes: string[];
}

export interface ThermalDegradationResult {
  equipmentId: string;
  heatExchangeEfficiencyPercent: number;
  temperatureDelta: number;
  copEstimate: number; // Coefficient of Performance
  severity: AnomalySeverity;
  foulingDetected: boolean;
  refrigerantLeakSuspected: boolean;
  recommendedAction: string;
}

export interface RulEstimationResult {
  equipmentId: string;
  estimatedRulHours: number;
  confidenceInterval: {
    lowerBoundHours: number;
    upperBoundHours: number;
  };
  healthIndexPercent: number; // 0 - 100
  hazardRate: number;
  timeToCriticalFailureHours: number;
  recommendedMaintenanceWindowDays: number;
}
