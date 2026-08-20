import { StudentTranscriptEntry } from './advising-types';
import { kmStore } from '@/lib/db/km-store';

export type RiskTier = 'nominal' | 'advisory' | 'moderate_risk' | 'critical_intervention';

export interface InterventionAnalysis {
  studentId: string;
  riskTier: RiskTier;
  reason: string;
  recommendedActions: string[];
  requiresAdvisorEscalation: boolean;
}

export class AcademicInterventionEngine {
  /**
   * Analyzes student academic velocity, GPA dips, and failed courses to recommend interventions.
   */
  public evaluateStudentRisk(
    studentId: string,
    transcript: StudentTranscriptEntry[],
    attendanceRatePercent: number = 90
  ): InterventionAnalysis {
    const failedCourses = transcript.filter((t) => t.grade === 'F');
    const recentDips = transcript.filter((t) => t.grade === 'D' || t.grade === 'C-');

    if (failedCourses.length >= 2 || attendanceRatePercent < 65) {
      return {
        studentId,
        riskTier: 'critical_intervention',
        reason: `Multiple failed courses (${failedCourses.length}) or severe attendance deficit (${attendanceRatePercent}%).`,
        recommendedActions: [
          'Mandatory academic advising session within 48 hours',
          'Course load reduction to 12 credits next semester',
          'Referral to University Learning & Tutoring Center',
        ],
        requiresAdvisorEscalation: true,
      };
    }

    if (failedCourses.length === 1 || recentDips.length >= 2 || attendanceRatePercent < 75) {
      return {
        studentId,
        riskTier: 'moderate_risk',
        reason: `Single course failure or declining semester performance trend.`,
        recommendedActions: [
          'Recommended prerequisite review course',
          'Weekly peer tutoring for difficult technical subjects',
          'Mid-term check-in with faculty mentor',
        ],
        requiresAdvisorEscalation: false,
      };
    }

    if (recentDips.length === 1 || attendanceRatePercent < 85) {
      return {
        studentId,
        riskTier: 'advisory',
        reason: 'Minor attendance fluctuation or single grade dip.',
        recommendedActions: [
          'Encourage attendance recovery',
          'Explore academic writing/tutoring workshops',
        ],
        requiresAdvisorEscalation: false,
      };
    }

    return {
      studentId,
      riskTier: 'nominal',
      reason: 'Academic performance and attendance are in good standing.',
      recommendedActions: [
        'Explore undergraduate research opportunities',
        'Consider honors program electives',
      ],
      requiresAdvisorEscalation: false,
    };
  }

  public async recordIntervention(analysis: InterventionAnalysis, institutionId: string = 'global'): Promise<any> {
    return await kmStore.createAdvisingIntervention({
      interventionId: `intv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      studentId: analysis.studentId,
      riskTier: analysis.riskTier,
      reason: analysis.reason,
      recommendedActions: JSON.stringify(analysis.recommendedActions),
      status: analysis.requiresAdvisorEscalation ? 'in_review' : 'pending',
      institutionId,
    });
  }
}

export const academicInterventionEngine = new AcademicInterventionEngine();
