import { db } from "@thaiba/db";
import { aiPredictions } from "@thaiba/db/schema";
import { extractStudentFeatures, type StudentFeatureVector } from "./feature-extractor";
import { eq, and } from "drizzle-orm";

export interface FeeDefaultPredictionResult {
  studentId: string;
  studentName?: string;
  unpaidBalance: number;
  projectedPaymentDelayDays: number;
  riskLevel: "low" | "medium" | "high" | "critical";
  confidenceScore: number;
  riskFactors: string[];
}

export interface FeeCollectionForecast {
  institutionId: string;
  projected30DayRealizationRate: number; // percentage
  projected60DayRealizationRate: number;
  totalUnpaidBalance: number;
  highRiskDefaultCount: number;
  atRiskDefaultCount: number;
  predictions: FeeDefaultPredictionResult[];
}

export function predictFeeDefaultRisk(vector: StudentFeatureVector): FeeDefaultPredictionResult {
  const { unpaidFeeBalance, feePaymentDelayDays, studentId, studentName } = vector;

  let riskLevel: "low" | "medium" | "high" | "critical" = "low";
  let confidenceScore = 0.72;
  const riskFactors: string[] = [];

  if (unpaidFeeBalance > 50000 || feePaymentDelayDays > 60) {
    riskLevel = "critical";
    confidenceScore = 0.91;
    riskFactors.push(`Severe fee delinquency (Balance: ₹${unpaidFeeBalance}, Max Delay: ${feePaymentDelayDays} days)`);
  } else if (unpaidFeeBalance > 20000 || feePaymentDelayDays > 30) {
    riskLevel = "high";
    confidenceScore = 0.84;
    riskFactors.push(`Significant overdue fee balance (Balance: ₹${unpaidFeeBalance}, Delay: ${feePaymentDelayDays} days)`);
  } else if (unpaidFeeBalance > 5000 || feePaymentDelayDays > 14) {
    riskLevel = "medium";
    confidenceScore = 0.76;
    riskFactors.push(`Minor payment delay detected (Balance: ₹${unpaidFeeBalance})`);
  }

  if (riskFactors.length === 0) {
    riskFactors.push("Good fee payment history with prompt realization");
  }

  const projectedPaymentDelayDays = Math.max(feePaymentDelayDays, riskLevel === "critical" ? 45 : riskLevel === "high" ? 25 : 5);

  return {
    studentId,
    studentName,
    unpaidBalance: unpaidFeeBalance,
    projectedPaymentDelayDays,
    riskLevel,
    confidenceScore: Math.round(confidenceScore * 100) / 100,
    riskFactors,
  };
}

export async function runFeeForecasting(
  institutionId: string,
  targetStudentId?: string
): Promise<FeeCollectionForecast> {
  const vectors = await extractStudentFeatures(institutionId, targetStudentId);
  const predictions: FeeDefaultPredictionResult[] = [];

  let totalUnpaid = 0;
  let highRiskCount = 0;
  let atRiskCount = 0;

  for (const vec of vectors) {
    const pred = predictFeeDefaultRisk(vec);
    predictions.push(pred);

    totalUnpaid += pred.unpaidBalance;
    if (pred.riskLevel === "critical" || pred.riskLevel === "high") {
      highRiskCount++;
    }
    if (pred.riskLevel !== "low") {
      atRiskCount++;
    }

    try {
      const existing = await db
        .select()
        .from(aiPredictions)
        .where(
          and(
            eq(aiPredictions.institutionId, institutionId),
            eq(aiPredictions.targetEntityId, vec.studentId),
            eq(aiPredictions.predictionType, "fee_default")
          )
        );

      const recordId = existing[0]?.id || `pred_fee_${vec.studentId}_${Date.now()}`;

      if (existing.length > 0) {
        await db
          .update(aiPredictions)
          .set({
            riskLevel: pred.riskLevel,
            confidenceScore: pred.confidenceScore,
            predictedValue: JSON.stringify({ unpaidBalance: pred.unpaidBalance, delayDays: pred.projectedPaymentDelayDays }),
            riskFactors: JSON.stringify(pred.riskFactors),
            updatedAt: new Date().toISOString(),
          })
          .where(eq(aiPredictions.id, recordId));
      } else {
        await db.insert(aiPredictions).values({
          id: recordId,
          institutionId,
          domain: "fees",
          targetEntityId: vec.studentId,
          targetEntityType: "student",
          predictionType: "fee_default",
          riskLevel: pred.riskLevel,
          confidenceScore: pred.confidenceScore,
          predictedValue: JSON.stringify({ unpaidBalance: pred.unpaidBalance, delayDays: pred.projectedPaymentDelayDays }),
          riskFactors: JSON.stringify(pred.riskFactors),
          status: "active",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.warn("[Fee Forecast Persistence Notice]", err);
    }
  }

  const projected30Day = Math.max(70, Math.min(98, 95 - (highRiskCount * 2)));
  const projected60Day = Math.max(80, Math.min(99, 98 - (highRiskCount * 1)));

  return {
    institutionId,
    projected30DayRealizationRate: projected30Day,
    projected60DayRealizationRate: projected60Day,
    totalUnpaidBalance: totalUnpaid,
    highRiskDefaultCount: highRiskCount,
    atRiskDefaultCount: atRiskCount,
    predictions,
  };
}
