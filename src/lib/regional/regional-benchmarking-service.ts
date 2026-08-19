import { db } from "@/db";
import {
  dwAggregatedAnalytics,
  regionalBenchmarks,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import { ensureRegionalTablesExist } from "./dw-etl-service";

export interface BenchmarkQueryOptions {
  regionalGroupId: string;
  period?: "30d" | "60d" | "90d" | "term" | "annual";
  metricDomain?: "attendance" | "fees" | "academic" | "ai_risk" | "all";
}

export interface CampusBenchmark {
  institutionId: string;
  metricDomain: string;
  period: string;
  rawScore: number;
  normalizedScore: number; // Z-score
  percentileRank: number; // 0 to 100
  rankPosition: number; // 1 to N
}

export class RegionalBenchmarkingService {
  /**
   * Calculate z-score normalized cross-institution performance benchmarks.
   */
  static async calculateBenchmarks(options: BenchmarkQueryOptions): Promise<CampusBenchmark[]> {
    await ensureRegionalTablesExist();

    const period = options.period || "30d";
    const domain = options.metricDomain || "all";

    // Retrieve aggregated analytics for the group
    let records = await db
      .select()
      .from(dwAggregatedAnalytics)
      .where(eq(dwAggregatedAnalytics.regionalGroupId, options.regionalGroupId))
      .all();

    // Fallback if empty — query all aggregated analytics
    if (records.length === 0) {
      records = await db.select().from(dwAggregatedAnalytics).all();
    }

    if (records.length === 0) {
      // Return empty array if no aggregated metrics exist yet
      return [];
    }

    // Extract composite score (average of attendance, fee, academic pass rate)
    const items = records.map((r) => {
      let raw = 0;
      if (domain === "attendance") raw = r.attendanceRate;
      else if (domain === "fees") raw = r.feeRealizationRate;
      else if (domain === "academic") raw = r.academicPassRate;
      else if (domain === "ai_risk") raw = Math.max(0, 100 - r.aiRiskStudentCount * 5);
      else raw = Math.round(((r.attendanceRate + r.feeRealizationRate + r.academicPassRate) / 3) * 100) / 100;

      return { institutionId: r.institutionId, rawScore: raw };
    });

    const N = items.length;
    const rawScores = items.map((i) => i.rawScore);
    const mean = rawScores.reduce((a, b) => a + b, 0) / N;
    const variance = rawScores.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / N;
    const stdDev = Math.sqrt(variance);

    // Sort descending by raw score for rank calculation
    const sorted = [...items].sort((a, b) => b.rawScore - a.rawScore);

    const benchmarks: CampusBenchmark[] = [];

    for (let index = 0; index < sorted.length; index++) {
      const item = sorted[index];
      const rankPosition = index + 1;

      // Z-score
      const zScore = stdDev > 0 ? Math.round(((item.rawScore - mean) / stdDev) * 100) / 100 : 0;

      // Percentile rank
      const percentileRank = N > 1 ? Math.round(((N - rankPosition) / (N - 1)) * 10000) / 100 : 100;

      const recordId = `bm_${options.regionalGroupId}_${item.institutionId}_${domain}_${period}`;
      const benchmarkData: CampusBenchmark = {
        institutionId: item.institutionId,
        metricDomain: domain,
        period,
        rawScore: item.rawScore,
        normalizedScore: zScore,
        percentileRank,
        rankPosition,
      };

      // Store in DB
      await db.delete(regionalBenchmarks).where(eq(regionalBenchmarks.id, recordId)).run();
      await db.insert(regionalBenchmarks).values({
        id: recordId,
        regionalGroupId: options.regionalGroupId,
        institutionId: item.institutionId,
        metricDomain: domain,
        period,
        rawScore: item.rawScore,
        normalizedScore: zScore,
        percentileRank,
        rankPosition,
        calculatedAt: new Date().toISOString(),
      }).run();

      benchmarks.push(benchmarkData);
    }

    return benchmarks;
  }
}
