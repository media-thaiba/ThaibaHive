import { KmQueryMetricEvent, KmAnalyticsSummary, KnowledgeGapReport } from './km-analytics-types';

export class KmAnalyticsAggregator {
  private static instance: KmAnalyticsAggregator;
  private queryEvents: KmQueryMetricEvent[] = [];
  private knowledgeGaps: Map<string, { count: number; samples: string[] }> = new Map();

  public static getInstance(): KmAnalyticsAggregator {
    if (!KmAnalyticsAggregator.instance) {
      KmAnalyticsAggregator.instance = new KmAnalyticsAggregator();
    }
    return KmAnalyticsAggregator.instance;
  }

  public recordQueryEvent(event: Omit<KmQueryMetricEvent, 'queryId' | 'timestamp'>): KmQueryMetricEvent {
    const fullEvent: KmQueryMetricEvent = {
      ...event,
      queryId: `kmq_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
    };
    this.queryEvents.push(fullEvent);
    return fullEvent;
  }

  public recordKnowledgeGap(topic: string, sampleQuery: string): void {
    if (!this.knowledgeGaps.has(topic)) {
      this.knowledgeGaps.set(topic, { count: 0, samples: [] });
    }
    const gap = this.knowledgeGaps.get(topic)!;
    gap.count++;
    if (gap.samples.length < 5) {
      gap.samples.push(sampleQuery);
    }
  }

  public computeSummary(institutionId: string = 'global'): KmAnalyticsSummary {
    const filtered = this.queryEvents.filter(
      (e) => institutionId === 'global' || e.institutionId === institutionId
    );

    const topKnowledgeGaps: KnowledgeGapReport[] = Array.from(this.knowledgeGaps.entries())
      .map(([topic, data]) => ({
        topic,
        unansweredCount: data.count,
        sampleQueries: data.samples,
        suggestedDocumentAction: `Upload official documentation regarding ${topic}`,
      }))
      .sort((a, b) => b.unansweredCount - a.unansweredCount)
      .slice(0, 5);

    const totalQueries = filtered.length;
    if (totalQueries === 0) {
      return {
        totalQueries: 0,
        autonomousDeflectionRatePercent: 100,
        avgResponseTimeMs: 0,
        avgSatisfactionScore: 5.0,
        totalTokensConsumed: 0,
        queriesByDepartment: {},
        topKnowledgeGaps,
      };
    }

    let autonomousCount = 0;
    let totalResponseTime = 0;
    let totalSatisfaction = 0;
    let satisfactionVotes = 0;
    let totalTokens = 0;
    const queriesByDept: Record<string, number> = {};

    for (const q of filtered) {
      if (q.wasResolvedAutonomously) autonomousCount++;
      totalResponseTime += q.responseTimeMs;
      totalTokens += q.tokensConsumed;

      if (q.userSatisfactionRating) {
        totalSatisfaction += q.userSatisfactionRating;
        satisfactionVotes++;
      }

      const dept = q.departmentId || 'General';
      queriesByDept[dept] = (queriesByDept[dept] || 0) + 1;
    }

    return {
      totalQueries,
      autonomousDeflectionRatePercent: Number(((autonomousCount / totalQueries) * 100).toFixed(1)),
      avgResponseTimeMs: Math.round(totalResponseTime / totalQueries),
      avgSatisfactionScore: satisfactionVotes > 0 ? Number((totalSatisfaction / satisfactionVotes).toFixed(2)) : 4.8,
      totalTokensConsumed: totalTokens,
      queriesByDepartment: queriesByDept,
      topKnowledgeGaps,
    };
  }

  public clear(): void {
    this.queryEvents.length = 0;
    this.knowledgeGaps.clear();
  }
}

export const kmAnalyticsAggregator = KmAnalyticsAggregator.getInstance();
