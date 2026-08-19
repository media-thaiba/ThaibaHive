import { db } from "@/db";
import { workspaceAnalyticsCache } from "@thaiba/db/schema";
import { and, eq } from "drizzle-orm";
import { getAttendanceAnalytics, AttendanceAnalytics } from "@/lib/analytics/attendance-analytics";
import { getFinancialAnalytics, FinancialAnalytics } from "@/lib/analytics/finance-analytics";
import { getAcademicsAnalytics, AcademicAnalytics } from "@/lib/analytics/academic-analytics";
import { getUsageAnalytics, UsageAnalytics } from "@/lib/analytics/usage-analytics";
import { StudentPredictionEngine } from "@/lib/analytics/prediction-engine";
import { extractStudentFeatures } from "@/lib/ai/feature-extractor";
import { PredictiveBudgetEngine } from "@/lib/services/predictive-budget-engine";

export interface StudentRiskSummary {
  studentId: string;
  studentName: string;
  riskScore: number;
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  confidenceScore: number;
  primaryRiskDrivers: string[];
  recommendations: string[];
}

export interface UnifiedPredictiveAnalytics {
  budgetForecast: {
    deficitPercent: number;
    riskLevel: string;
    targetAmount: number;
    projectedAmount: number;
  };
  retentionRisk: {
    highRiskCount: number;
    moderateRiskCount: number;
    lowRiskCount: number;
    studentsAtRisk: StudentRiskSummary[];
  };
}

export class AnalyticsService {
  /**
   * Helper to retrieve or calculate analytics metrics with multi-tier caching (DB-backed summary cache + invalidation).
   */
  static async getOrCalculate<T>(
    institutionId: string,
    role: string,
    metricName: string,
    timeBucket: string,
    calculator: () => Promise<T>,
    ttlSeconds = 300
  ): Promise<T> {
    const cacheKey = `analytics:${institutionId}:${role}:${metricName}:${timeBucket}`;
    
    try {
      // 1. Try DB-backed materialized cache first
      const cached = await db
        .select()
        .from(workspaceAnalyticsCache)
        .where(
          and(
            eq(workspaceAnalyticsCache.institutionId, institutionId),
            eq(workspaceAnalyticsCache.role, role),
            eq(workspaceAnalyticsCache.metricName, metricName),
            eq(workspaceAnalyticsCache.timeBucket, timeBucket)
          )
        )
        .get();

      if (cached) {
        const ageMs = Date.now() - new Date(cached.calculatedAt).getTime();
        if (ageMs < ttlSeconds * 1000) {
          console.log(`[AnalyticsService] Cache HIT for ${cacheKey}`);
          return JSON.parse(cached.metricValue) as T;
        }
      }

      // 2. Cache MISS: Run calculation
      console.log(`[AnalyticsService] Cache MISS for ${cacheKey}. Calculating...`);
      const value = await calculator();

      // Save to materialized DB cache
      const id = `ac_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      
      // Delete old key if exists to ensure cross-database compatibility (SQLite & PG)
      await db
        .delete(workspaceAnalyticsCache)
        .where(
          and(
            eq(workspaceAnalyticsCache.institutionId, institutionId),
            eq(workspaceAnalyticsCache.role, role),
            eq(workspaceAnalyticsCache.metricName, metricName),
            eq(workspaceAnalyticsCache.timeBucket, timeBucket)
          )
        )
        .run();

      await db.insert(workspaceAnalyticsCache).values({
        id,
        institutionId,
        role,
        metricName,
        metricValue: JSON.stringify(value),
        calculatedAt: new Date().toISOString(),
        timeBucket
      }).run();

      return value;
    } catch (e) {
      console.error(`[AnalyticsService] Caching failed for ${cacheKey}`, e);
      return calculator();
    }
  }

  /**
   * Clear cache for a specific institution. Called by write-through hooks.
   */
  static async invalidateCache(institutionId: string): Promise<void> {
    try {
      await db.delete(workspaceAnalyticsCache).where(eq(workspaceAnalyticsCache.institutionId, institutionId)).run();
      console.log(`[AnalyticsService] Invalidated cache for institution: ${institutionId}`);
    } catch (e) {
      console.error("[AnalyticsService] Invalidation failed", e);
    }
  }

  // ─── Domain Analytics Methods ───

  static async getAttendance(
    institutionId: string,
    startDate: string,
    endDate: string
  ): Promise<AttendanceAnalytics> {
    const timeBucket = `${startDate}_${endDate}`;
    return this.getOrCalculate(
      institutionId,
      "principal",
      "attendance",
      timeBucket,
      () => getAttendanceAnalytics(institutionId, startDate, endDate)
    );
  }

  static async getFinance(
    institutionId: string,
    startDate: string,
    endDate: string
  ): Promise<FinancialAnalytics> {
    const timeBucket = `${startDate}_${endDate}`;
    return this.getOrCalculate(
      institutionId,
      "cashier",
      "finance",
      timeBucket,
      () => getFinancialAnalytics(institutionId, startDate, endDate)
    );
  }

  static async getAcademics(
    institutionId: string,
    classId?: string
  ): Promise<AcademicAnalytics> {
    const timeBucket = classId ?? "all_classes";
    return this.getOrCalculate(
      institutionId,
      "teacher",
      "academics",
      timeBucket,
      () => getAcademicsAnalytics(institutionId, classId)
    );
  }

  static async getPlatformUsage(institutionId: string): Promise<UsageAnalytics> {
    return this.getOrCalculate(
      institutionId,
      "admin",
      "usage",
      "live",
      () => getUsageAnalytics(institutionId)
    );
  }

  static async getPredictive(institutionId: string): Promise<UnifiedPredictiveAnalytics> {
    return this.getOrCalculate(
      institutionId,
      "principal",
      "predictive",
      "live",
      async () => {
        const budgetResult = await PredictiveBudgetEngine.forecastInstitutionBudget(institutionId);
        const engine = new StudentPredictionEngine();
        const rawFeatures = await extractStudentFeatures(institutionId);

        const studentsAtRisk = rawFeatures.map((f) => {
          const attendanceFeature = Math.max(0, Math.min(1, f.attendanceRate30d / 100));
          const examTrendFeature = Math.max(0, Math.min(1, f.academicMarkAverage / 100));
          const assignmentFeature = 0.8;
          const engagementFeature = 0.75;
          const financialRiskFeature = f.unpaidFeeBalance > 5000 ? 0.3 : (f.unpaidFeeBalance > 0 ? 0.6 : 1.0);

          const featureVector = {
            studentId: f.studentId,
            tenantId: institutionId,
            attendanceFeature,
            assignmentFeature,
            examTrendFeature,
            engagementFeature,
            financialRiskFeature,
            compositeVector: [attendanceFeature, assignmentFeature, examTrendFeature, engagementFeature, financialRiskFeature],
            extractedAt: Date.now(),
          };

          const assessment = engine.predictStudentRisk(featureVector);
          return {
            studentId: f.studentId,
            studentName: f.studentName || "Unknown Student",
            riskScore: assessment.riskScore,
            riskLevel: assessment.riskLevel,
            confidenceScore: assessment.confidenceScore,
            primaryRiskDrivers: assessment.primaryRiskDrivers,
            recommendations: assessment.recommendations,
          };
        });

        const highRiskCount = studentsAtRisk.filter((s) => s.riskLevel === "HIGH").length;
        const moderateRiskCount = studentsAtRisk.filter((s) => s.riskLevel === "MEDIUM").length;
        const lowRiskCount = studentsAtRisk.filter((s) => s.riskLevel === "LOW").length;

        return {
          budgetForecast: {
            deficitPercent: budgetResult.realizationDeficitPercent,
            riskLevel: budgetResult.riskLevel,
            targetAmount: budgetResult.targetBudgetAmount,
            projectedAmount: budgetResult.forecastP50,
          },
          retentionRisk: {
            highRiskCount,
            moderateRiskCount,
            lowRiskCount,
            studentsAtRisk,
          },
        };
      }
    );
  }
}
export type { AttendanceAnalytics, FinancialAnalytics, AcademicAnalytics, UsageAnalytics };
