import { db } from "@thaiba/db";
import { aiPredictions } from "@thaiba/db/schema";
import { extractStudentFeatures, type StudentFeatureVector } from "./feature-extractor";
import { eq, and } from "drizzle-orm";

export interface AttendancePredictionResult {
  studentId: string;
  studentName?: string;
  predictedAttendance30d: number;
  riskLevel: "low" | "medium" | "high" | "critical";
  confidenceScore: number;
  riskFactors: string[];
}

export function predictAttendanceRisk(vector: StudentFeatureVector): AttendancePredictionResult {
  const { attendanceRate30d, attendanceRate90d, absenceClusterMonday, studentId, studentName } = vector;

  let riskLevel: "low" | "medium" | "high" | "critical" = "low";
  let confidenceScore = 0.70;
  const riskFactors: string[] = [];

  const trendDrop = attendanceRate90d - attendanceRate30d;

  if (attendanceRate30d < 70) {
    riskLevel = "critical";
    confidenceScore = 0.92;
    riskFactors.push("Severe attendance drop (< 70% over past 30 days)");
  } else if (attendanceRate30d < 80) {
    riskLevel = "high";
    confidenceScore = 0.85;
    riskFactors.push("High absenteeism rate (< 80% over past 30 days)");
  } else if (attendanceRate30d < 90) {
    riskLevel = "medium";
    confidenceScore = 0.78;
    riskFactors.push("Below average attendance (< 90%)");
  }

  if (absenceClusterMonday >= 3) {
    riskFactors.push(`Frequent Monday absenteeism detected (${absenceClusterMonday} Mondays missed)`);
    if (riskLevel === "low") riskLevel = "medium";
    else if (riskLevel === "medium") riskLevel = "high";
    confidenceScore = Math.min(0.95, confidenceScore + 0.05);
  }

  if (trendDrop >= 10) {
    riskFactors.push(`Accelerating absence trajectory (30-day rate is ${trendDrop.toFixed(1)}% lower than 90-day rate)`);
    if (riskLevel === "low") riskLevel = "medium";
    else if (riskLevel === "medium") riskLevel = "high";
    else if (riskLevel === "high") riskLevel = "critical";
    confidenceScore = Math.min(0.95, confidenceScore + 0.08);
  }

  if (riskFactors.length === 0) {
    riskFactors.push("Consistent attendance pattern with low absenteeism risk");
  }

  const predictedAttendance30d = Math.max(0, Math.min(100, Math.round(attendanceRate30d - (trendDrop > 0 ? trendDrop * 0.5 : 0))));

  return {
    studentId,
    studentName,
    predictedAttendance30d,
    riskLevel,
    confidenceScore: Math.round(confidenceScore * 100) / 100,
    riskFactors,
  };
}

export async function runAttendancePredictions(
  institutionId: string,
  targetStudentId?: string
): Promise<AttendancePredictionResult[]> {
  const vectors = await extractStudentFeatures(institutionId, targetStudentId);
  const results: AttendancePredictionResult[] = [];

  for (const vec of vectors) {
    const pred = predictAttendanceRisk(vec);
    results.push(pred);

    try {
      const existing = await db
        .select()
        .from(aiPredictions)
        .where(
          and(
            eq(aiPredictions.institutionId, institutionId),
            eq(aiPredictions.targetEntityId, vec.studentId),
            eq(aiPredictions.predictionType, "chronic_absenteeism")
          )
        );

      const recordId = existing[0]?.id || `pred_att_${vec.studentId}_${Date.now()}`;

      if (existing.length > 0) {
        await db
          .update(aiPredictions)
          .set({
            riskLevel: pred.riskLevel,
            confidenceScore: pred.confidenceScore,
            predictedValue: JSON.stringify({ predictedAttendance30d: pred.predictedAttendance30d }),
            riskFactors: JSON.stringify(pred.riskFactors),
            updatedAt: new Date().toISOString(),
          })
          .where(eq(aiPredictions.id, recordId));
      } else {
        await db.insert(aiPredictions).values({
          id: recordId,
          institutionId,
          domain: "attendance",
          targetEntityId: vec.studentId,
          targetEntityType: "student",
          predictionType: "chronic_absenteeism",
          riskLevel: pred.riskLevel,
          confidenceScore: pred.confidenceScore,
          predictedValue: JSON.stringify({ predictedAttendance30d: pred.predictedAttendance30d }),
          riskFactors: JSON.stringify(pred.riskFactors),
          status: "active",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.warn("[Attendance Prediction Persistence Notice]", err);
    }
  }

  return results;
}
