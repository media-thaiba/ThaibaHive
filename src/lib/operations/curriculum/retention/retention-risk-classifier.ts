import { RetentionRiskTier } from '../curriculum-types';
import { RetentionPredictionResult, RiskFactorDetail, StudentRetentionFeatures } from './retention-types';

export class RetentionRiskClassifier {
  /**
   * Predicts student retention risk score [0.0 - 1.0]
   */
  public predictRisk(features: StudentRetentionFeatures): RetentionPredictionResult {
    let score = 0.0;
    const topRiskFactors: RiskFactorDetail[] = [];
    const recommendedInterventions: string[] = [];

    // 1. GPA Absolute Risk (Weight: 35%)
    if (features.cumulativeGpa < 2.0) {
      score += 0.35;
      topRiskFactors.push({
        factorName: 'Cumulative GPA below 2.0',
        weight: 0.35,
        description: `Current GPA (${features.cumulativeGpa.toFixed(2)}) places student in academic probation territory.`,
      });
      recommendedInterventions.push('Enroll in Academic Recovery probation triage');
    } else if (features.cumulativeGpa < 2.5) {
      score += 0.15;
      topRiskFactors.push({
        factorName: 'Borderline Cumulative GPA',
        weight: 0.15,
        description: `GPA (${features.cumulativeGpa.toFixed(2)}) is close to academic probation threshold.`,
      });
    }

    // 2. GPA Velocity Drop (Weight: 20%)
    if (features.gpaVelocity <= -0.75) {
      score += 0.20;
      topRiskFactors.push({
        factorName: 'Severe GPA Velocity Drop',
        weight: 0.20,
        description: `GPA dropped by ${Math.abs(features.gpaVelocity).toFixed(2)} points from prior term.`,
      });
      recommendedInterventions.push('Schedule urgent 1-on-1 advisor check-in');
    } else if (features.gpaVelocity <= -0.4) {
      score += 0.10;
      topRiskFactors.push({
        factorName: 'Negative GPA Trend',
        weight: 0.10,
        description: `GPA declined by ${Math.abs(features.gpaVelocity).toFixed(2)} points.`,
      });
    }

    // 3. Prerequisite Failures & Drops (Weight: 25%)
    if (features.prerequisiteFailureCount > 0) {
      const failurePenalty = Math.min(0.20, features.prerequisiteFailureCount * 0.10);
      score += failurePenalty;
      topRiskFactors.push({
        factorName: 'Prerequisite Course Failures',
        weight: failurePenalty,
        description: `Failed ${features.prerequisiteFailureCount} prerequisite course(s), blocking progression.`,
      });
      recommendedInterventions.push('Adjust degree roadmap for repeat course forgiveness');
    }

    if (features.courseDropCount >= 2) {
      score += 0.10;
      topRiskFactors.push({
        factorName: 'Multiple Course Drops',
        weight: 0.10,
        description: `Dropped ${features.courseDropCount} courses in current academic year.`,
      });
    }

    // 4. Attendance & LMS Engagement (Weight: 20%)
    if (features.attendancePercentage < 70) {
      score += 0.15;
      topRiskFactors.push({
        factorName: 'Chronic Absenteeism',
        weight: 0.15,
        description: `Attendance rate (${features.attendancePercentage}%) indicates disengagement.`,
      });
      recommendedInterventions.push('Trigger automated EngageOS attendance outreach drip');
    }

    if (features.lmsSubmissionDelayDays > 5) {
      score += 0.08;
      topRiskFactors.push({
        factorName: 'LMS Assignment Delays',
        weight: 0.08,
        description: `Average assignment submission delay is ${features.lmsSubmissionDelayDays} days.`,
      });
    }

    const finalScore = Math.min(1.0, Math.round(score * 100) / 100);

    let riskTier: RetentionRiskTier = 'low';
    if (finalScore >= 0.70) {
      riskTier = 'critical';
    } else if (finalScore >= 0.50) {
      riskTier = 'high';
    } else if (finalScore >= 0.25) {
      riskTier = 'medium';
    }

    if (recommendedInterventions.length === 0) {
      recommendedInterventions.push('Continue standard academic monitoring and routine advising check-in');
    }

    return {
      studentId: features.studentId,
      riskScore: finalScore,
      riskTier,
      isAtRisk: finalScore >= 0.50,
      topRiskFactors,
      recommendedInterventions,
      confidence: 0.88,
      predictionTimestamp: new Date().toISOString(),
    };
  }
}
