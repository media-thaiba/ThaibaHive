import { StudentRiskModel } from '@/lib/operations/analytics/student-risk-model';
import { RetentionPredictor } from '@/lib/operations/analytics/retention-predictor';
import { ResourceDemandModel } from '@/lib/operations/analytics/resource-demand-model';
import { FinancialForecaster } from '@/lib/operations/analytics/financial-forecaster';

describe('StudentRiskModel, RetentionPredictor, ResourceDemand & FinancialForecaster', () => {
  it('should evaluate at-risk students with top factor explanations', () => {
    const assessment = StudentRiskModel.evaluateRisk({
      studentId: 'std_101',
      campusId: 'campus_1',
      gpa: 1.8,
      attendancePercentage: 62,
      lmsActiveHoursPerWeek: 1.5,
      unpaidFeeBalance: 800,
      prerequisiteCoursesPassedRatio: 0.4,
    });

    expect(assessment.studentId).toBe('std_101');
    expect(assessment.riskProbability).toBeGreaterThan(0.6);
    expect(['HIGH', 'CRITICAL']).toContain(assessment.riskCategory);
    expect(assessment.topRiskFactors.length).toBeGreaterThan(0);
    expect(assessment.recommendedInterventions.length).toBeGreaterThan(0);
  });

  it('should perform batch predictions across student cohorts', () => {
    const cohort = [
      {
        studentId: 's1',
        campusId: 'c1',
        gpa: 3.8,
        attendancePercentage: 95,
        lmsActiveHoursPerWeek: 10,
        unpaidFeeBalance: 0,
        prerequisiteCoursesPassedRatio: 1.0,
      },
      {
        studentId: 's2',
        campusId: 'c1',
        gpa: 1.9,
        attendancePercentage: 60,
        lmsActiveHoursPerWeek: 2,
        unpaidFeeBalance: 1200,
        prerequisiteCoursesPassedRatio: 0.3,
      },
    ];

    const result = RetentionPredictor.batchPredict(cohort);
    expect(result.assessments.length).toBe(2);
    expect(result.averageCohortRisk).toBeGreaterThan(0);
  });

  it('should forecast resource capacity surplus and deficits', () => {
    const proj = ResourceDemandModel.forecastDemand(250, 45, 'Computer Science', 2);
    expect(proj.projectedLabHoursNeeded).toBe(625);
    expect(proj.capacitySurplusOrDeficit).toBe(-125); // Deficit
    expect(proj.bottleneckAlerts.length).toBeGreaterThan(0);
  });

  it('should forecast institutional financials and calculate margin bounds', () => {
    const forecast = FinancialForecaster.forecastFinancials('campus_1', 1000, 6000, 1000000);
    expect(forecast.projectedTuitionRevenue).toBe(6000000);
    expect(forecast.projectedOpexExpenditure).toBe(3150000);
    expect(forecast.projectedNetMargin).toBe(2850000);
    expect(forecast.confidenceInterval[0]).toBeLessThan(forecast.projectedNetMargin);
  });
});
