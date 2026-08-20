import { kmAnalyticsAggregator } from '@/lib/operations/km/analytics/km-analytics-aggregator';

describe('Knowledge Analytics Aggregator (KM-019)', () => {
  beforeEach(() => {
    kmAnalyticsAggregator.clear();
  });

  it('should compute query volume, deflection percentage and satisfaction ratings', () => {
    kmAnalyticsAggregator.recordQueryEvent({
      topic: 'Graduation Requirements',
      intent: 'degree_audit',
      wasResolvedAutonomously: true,
      userSatisfactionRating: 5,
      responseTimeMs: 250,
      tokensConsumed: 120,
      departmentId: 'CS',
      institutionId: 'inst_alpha',
    });

    kmAnalyticsAggregator.recordQueryEvent({
      topic: 'Fee Payment Deadline',
      intent: 'policy_inquiry',
      wasResolvedAutonomously: true,
      userSatisfactionRating: 4,
      responseTimeMs: 180,
      tokensConsumed: 85,
      departmentId: 'Finance',
      institutionId: 'inst_alpha',
    });

    kmAnalyticsAggregator.recordQueryEvent({
      topic: 'Hostel Room Change',
      intent: 'counselor_escalation',
      wasResolvedAutonomously: false,
      userSatisfactionRating: 4,
      responseTimeMs: 600,
      tokensConsumed: 150,
      departmentId: 'Student Affairs',
      institutionId: 'inst_alpha',
    });

    const summary = kmAnalyticsAggregator.computeSummary('inst_alpha');

    expect(summary.totalQueries).toBe(3);
    expect(summary.autonomousDeflectionRatePercent).toBe(66.7);
    expect(summary.avgSatisfactionScore).toBeGreaterThanOrEqual(4.0);
    expect(summary.totalTokensConsumed).toBe(355);
    expect(summary.queriesByDepartment['CS']).toBe(1);
  });

  it('should identify top knowledge gaps', () => {
    kmAnalyticsAggregator.recordKnowledgeGap('Study Abroad Visa 2026', 'How to apply for exchange visa?');
    kmAnalyticsAggregator.recordKnowledgeGap('Study Abroad Visa 2026', 'What is visa deadline?');

    const summary = kmAnalyticsAggregator.computeSummary();
    expect(summary.topKnowledgeGaps.length).toBe(1);
    expect(summary.topKnowledgeGaps[0].topic).toBe('Study Abroad Visa 2026');
    expect(summary.topKnowledgeGaps[0].unansweredCount).toBe(2);
  });
});
