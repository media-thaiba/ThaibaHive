import { runAttendancePredictions } from "./attendance-prediction-service";
import { runFeeForecasting } from "./fee-forecasting-service";
import { runAcademicPredictions } from "./academic-prediction-service";
import { detectAnomalies, type OperationalAnomaly } from "./anomaly-detector";

export interface ExecutiveBriefing {
  institutionId: string;
  generatedAt: string;
  executiveSummary: string;
  metrics: {
    projectedAttendanceRate: number;
    projectedFeeRealizationRate: number;
    atRiskStudentCount: number;
    criticalRiskCount: number;
    activeAnomaliesCount: number;
  };
  anomalies: OperationalAnomaly[];
  recommendedActions: string[];
}

export async function generateExecutiveBriefing(institutionId: string): Promise<ExecutiveBriefing> {
  const attendancePreds = await runAttendancePredictions(institutionId);
  const feeForecast = await runFeeForecasting(institutionId);
  const academicPreds = await runAcademicPredictions(institutionId);
  const anomalies = await detectAnomalies(institutionId);

  const atRiskStudents = new Set<string>();
  let criticalCount = 0;

  attendancePreds.forEach((p) => {
    if (p.riskLevel !== "low") atRiskStudents.add(p.studentId);
    if (p.riskLevel === "critical") criticalCount++;
  });

  academicPreds.forEach((p) => {
    if (p.riskLevel !== "low") atRiskStudents.add(p.studentId);
    if (p.riskLevel === "critical") criticalCount++;
  });

  const avgAttendance = attendancePreds.length > 0
    ? Math.round(attendancePreds.reduce((a, b) => a + b.predictedAttendance30d, 0) / attendancePreds.length)
    : 92;

  const activeAnoms = anomalies.filter((a) => a.status === "unresolved");

  let summaryText = `Overall campus attendance projection for the next 30 days is ${avgAttendance}%. `;
  summaryText += `Fee collection realization is projected at ${feeForecast.projected30DayRealizationRate}% over the 30-day horizon. `;

  if (atRiskStudents.size > 0) {
    summaryText += `A total of ${atRiskStudents.size} student(s) have been flagged for early intervention (${criticalCount} critical). `;
  } else {
    summaryText += "Student academic performance and attendance trajectories remain stable. ";
  }

  if (activeAnoms.length > 0) {
    summaryText += `${activeAnoms.length} operational anomaly/anomalies require administrative investigation.`;
  } else {
    summaryText += "Campus operations are running smoothly within nominal parameters.";
  }

  const recommendedActions: string[] = [];
  if (criticalCount > 0) {
    recommendedActions.push(`Schedule immediate counselor intervention for ${criticalCount} critical at-risk student(s).`);
  }
  if (feeForecast.highRiskDefaultCount > 0) {
    recommendedActions.push(`Dispatch automated fee payment reminders for ${feeForecast.highRiskDefaultCount} high-risk fee account(s).`);
  }
  if (activeAnoms.length > 0) {
    recommendedActions.push("Review campus gate security logs and canteen transaction spikes with department heads.");
  }
  if (recommendedActions.length === 0) {
    recommendedActions.push("Maintain standard monitoring routines and quarterly evaluation cycles.");
  }

  return {
    institutionId,
    generatedAt: new Date().toISOString(),
    executiveSummary: summaryText,
    metrics: {
      projectedAttendanceRate: avgAttendance,
      projectedFeeRealizationRate: feeForecast.projected30DayRealizationRate,
      atRiskStudentCount: atRiskStudents.size,
      criticalRiskCount: criticalCount,
      activeAnomaliesCount: activeAnoms.length,
    },
    anomalies,
    recommendedActions,
  };
}
