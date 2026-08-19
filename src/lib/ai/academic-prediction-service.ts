import { db } from "@thaiba/db";
import { aiPredictions } from "@thaiba/db/schema";
import { extractStudentFeatures, type StudentFeatureVector } from "./feature-extractor";
import { eq, and } from "drizzle-orm";

export interface AcademicRiskPredictionResult {
  studentId: string;
  studentName?: string;
  currentMarkAverage: number;
  projectedFinalMark: number;
  markTrend: number;
  riskLevel: "low" | "medium" | "high" | "critical";
  confidenceScore: number;
  riskFactors: string[];
}

export function predictAcademicRisk(vector: StudentFeatureVector): AcademicRiskPredictionResult {
  const { academicMarkAverage, academicMarkTrend, totalExamsTaken, studentId, studentName } = vector;

  let riskLevel: "low" | "medium" | "high" | "critical" = "low";
  let confidenceScore = 0.70 + Math.min(0.20, totalExamsTaken * 0.05);
  const riskFactors: string[] = [];

  if (academicMarkAverage < 40) {
    riskLevel = "critical";
    riskFactors.push(`Severe academic failure risk (Current average: ${academicMarkAverage.toFixed(1)}%)`);
  } else if (academicMarkAverage < 55) {
    riskLevel = "high";
    riskFactors.push(`Vulnerable academic performance (Current average: ${academicMarkAverage.toFixed(1)}%)`);
  } else if (academicMarkAverage < 65) {
    riskLevel = "medium";
    riskFactors.push(`Below benchmark mark average (${academicMarkAverage.toFixed(1)}%)`);
  }

  if (academicMarkTrend <= -10) {
    riskFactors.push(`Declining score trajectory (${Math.abs(academicMarkTrend).toFixed(1)}% drop across exams)`);
    if (riskLevel === "low") riskLevel = "medium";
    else if (riskLevel === "medium") riskLevel = "high";
    else if (riskLevel === "high") riskLevel = "critical";
    confidenceScore = Math.min(0.95, confidenceScore + 0.05);
  }

  if (riskFactors.length === 0) {
    riskFactors.push("Stable academic performance meeting institutional benchmarks");
  }

  const projectedFinalMark = Math.max(0, Math.min(100, Math.round(academicMarkAverage + (academicMarkTrend * 0.5))));

  return {
    studentId,
    studentName,
    currentMarkAverage: Math.round(academicMarkAverage * 10) / 10,
    projectedFinalMark,
    markTrend: Math.round(academicMarkTrend * 10) / 10,
    riskLevel,
    confidenceScore: Math.round(confidenceScore * 100) / 100,
    riskFactors,
  };
}

export async function runAcademicPredictions(
  institutionId: string,
  targetStudentId?: string
): Promise<AcademicRiskPredictionResult[]> {
  const vectors = await extractStudentFeatures(institutionId, targetStudentId);
  const results: AcademicRiskPredictionResult[] = [];

  for (const vec of vectors) {
    const pred = predictAcademicRisk(vec);
    results.push(pred);

    try {
      const existing = await db
        .select()
        .from(aiPredictions)
        .where(
          and(
            eq(aiPredictions.institutionId, institutionId),
            eq(aiPredictions.targetEntityId, vec.studentId),
            eq(aiPredictions.predictionType, "academic_risk")
          )
        );

      const recordId = existing[0]?.id || `pred_acad_${vec.studentId}_${Date.now()}`;

      if (existing.length > 0) {
        await db
          .update(aiPredictions)
          .set({
            riskLevel: pred.riskLevel,
            confidenceScore: pred.confidenceScore,
            predictedValue: JSON.stringify({ currentAverage: pred.currentMarkAverage, projectedFinal: pred.projectedFinalMark }),
            riskFactors: JSON.stringify(pred.riskFactors),
            updatedAt: new Date().toISOString(),
          })
          .where(eq(aiPredictions.id, recordId));
      } else {
        await db.insert(aiPredictions).values({
          id: recordId,
          institutionId,
          domain: "academic",
          targetEntityId: vec.studentId,
          targetEntityType: "student",
          predictionType: "academic_risk",
          riskLevel: pred.riskLevel,
          confidenceScore: pred.confidenceScore,
          predictedValue: JSON.stringify({ currentAverage: pred.currentMarkAverage, projectedFinal: pred.projectedFinalMark }),
          riskFactors: JSON.stringify(pred.riskFactors),
          status: "active",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.warn("[Academic Prediction Persistence Notice]", err);
    }
  }

  return results;
}
