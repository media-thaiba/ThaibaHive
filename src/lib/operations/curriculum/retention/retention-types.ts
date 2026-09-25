import { RetentionRiskTier } from '../curriculum-types';

export interface StudentRetentionFeatures {
  studentId: string;
  cumulativeGpa: number;
  priorTermGpa: number;
  gpaVelocity: number; // delta: currentTerm - priorTerm
  courseDropCount: number;
  prerequisiteFailureCount: number;
  attendancePercentage: number; // 0..100
  lmsSubmissionDelayDays: number;
  creditLoadDeviation: number; // actualCredits - 15
}

export interface RiskFactorDetail {
  factorName: string;
  weight: number;
  description: string;
}

export interface RetentionPredictionResult {
  studentId: string;
  riskScore: number; // 0.00 - 1.00
  riskTier: RetentionRiskTier;
  isAtRisk: boolean;
  topRiskFactors: RiskFactorDetail[];
  recommendedInterventions: string[];
  confidence: number;
  predictionTimestamp: string;
}

export interface InterventionDispatchResult {
  alertId: string;
  studentId: string;
  channel: 'email' | 'sms' | 'whatsapp' | 'in_app';
  recipientContact: string;
  messageBody: string;
  scheduledAdvisorAppointmentUrl?: string;
  dispatchStatus: 'dispatched' | 'queued' | 'suppressed';
  dispatchedAt: string;
}
