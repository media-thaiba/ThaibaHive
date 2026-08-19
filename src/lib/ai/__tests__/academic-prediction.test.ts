import { predictAcademicRisk } from "../academic-prediction-service";
import type { StudentFeatureVector } from "../feature-extractor";

describe("Sprint-008 Academic Performance & At-Risk Prediction Engine", () => {
  it("classifies high mark averages with positive trend as low academic risk", () => {
    const vector: StudentFeatureVector = {
      studentId: "stu_01",
      institutionId: "inst_01",
      studentName: "Alice Walker",
      attendanceRate30d: 95,
      attendanceRate90d: 95,
      absenceClusterMonday: 0,
      unpaidFeeBalance: 0,
      feePaymentDelayDays: 0,
      academicMarkAverage: 88,
      academicMarkTrend: 4,
      totalExamsTaken: 3,
    };

    const result = predictAcademicRisk(vector);
    expect(result.riskLevel).toBe("low");
    expect(result.projectedFinalMark).toBeGreaterThanOrEqual(88);
  });

  it("flags low mark average (<40%) and negative trend as critical academic risk", () => {
    const vector: StudentFeatureVector = {
      studentId: "stu_02",
      institutionId: "inst_01",
      studentName: "Charlie Brown",
      attendanceRate30d: 75,
      attendanceRate90d: 80,
      absenceClusterMonday: 2,
      unpaidFeeBalance: 0,
      feePaymentDelayDays: 0,
      academicMarkAverage: 35,
      academicMarkTrend: -12,
      totalExamsTaken: 4,
    };

    const result = predictAcademicRisk(vector);
    expect(result.riskLevel).toBe("critical");
    expect(result.confidenceScore).toBeGreaterThanOrEqual(0.85);
    expect(result.riskFactors.some((f) => f.includes("Severe academic failure risk"))).toBe(true);
    expect(result.riskFactors.some((f) => f.includes("Declining score trajectory"))).toBe(true);
  });
});
