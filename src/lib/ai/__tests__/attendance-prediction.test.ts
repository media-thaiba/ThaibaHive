import { predictAttendanceRisk } from "../attendance-prediction-service";
import type { StudentFeatureVector } from "../feature-extractor";

describe("Sprint-008 Attendance Pattern & Absenteeism Prediction Engine", () => {
  it("classifies high attendance as low risk", () => {
    const vector: StudentFeatureVector = {
      studentId: "stu_01",
      institutionId: "inst_01",
      studentName: "John Doe",
      attendanceRate30d: 95,
      attendanceRate90d: 94,
      absenceClusterMonday: 0,
      unpaidFeeBalance: 0,
      feePaymentDelayDays: 0,
      academicMarkAverage: 85,
      academicMarkTrend: 2,
      totalExamsTaken: 4,
    };

    const result = predictAttendanceRisk(vector);
    expect(result.riskLevel).toBe("low");
    expect(result.confidenceScore).toBeGreaterThanOrEqual(0.7);
    expect(result.predictedAttendance30d).toBe(95);
  });

  it("identifies chronic absenteeism and Monday clustering as high/critical risk", () => {
    const vector: StudentFeatureVector = {
      studentId: "stu_02",
      institutionId: "inst_01",
      studentName: "Jane Smith",
      attendanceRate30d: 65,
      attendanceRate90d: 82,
      absenceClusterMonday: 4,
      unpaidFeeBalance: 0,
      feePaymentDelayDays: 0,
      academicMarkAverage: 60,
      academicMarkTrend: -5,
      totalExamsTaken: 3,
    };

    const result = predictAttendanceRisk(vector);
    expect(result.riskLevel).toBe("critical");
    expect(result.confidenceScore).toBeGreaterThanOrEqual(0.85);
    expect(result.riskFactors.length).toBeGreaterThan(1);
    expect(result.riskFactors.some((f) => f.includes("Monday absenteeism"))).toBe(true);
  });
});
