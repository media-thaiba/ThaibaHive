export type RiskSignal = 'ip_velocity' | 'geo_impossibility' | 'device_drift' | 'time_anomaly' | 'failed_attempts';
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface RiskScore {
  score: number;
  level: RiskLevel;
  triggers: RiskSignal[];
}
