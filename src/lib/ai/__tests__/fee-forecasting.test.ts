import { predictFeeDefaultRisk } from "../fee-forecasting-service";
import type { StudentFeatureVector } from "../feature-extractor";

describe("Sprint-008 Fee Collection Forecasting & Default Risk Engine", () => {
  it("classifies prompt payments as low default risk", () => {
    const vector: StudentFeatureVector = {
      studentId: "stu_01",
      institutionId: "inst_01",
      studentName: "John Doe",
      attendanceRate30d: 95,
      attendanceRate90d: 95,
      absenceClusterMonday: 0,
      unpaidFeeBalance: 0,
      feePaymentDelayDays: 0,
      academicMarkAverage: 80,
      academicMarkTrend: 0,
      totalExamsTaken: 3,
    };

    const result = predictFeeDefaultRisk(vector);
    expect(result.riskLevel).toBe("low");
    expect(result.unpaidBalance).toBe(0);
  });

  it("flags heavy fee balances and long delays as high/critical default risk", () => {
    const vector: StudentFeatureVector = {
      studentId: "stu_02",
      institutionId: "inst_01",
      studentName: "Bob Marley",
      attendanceRate30d: 80,
      attendanceRate90d: 85,
      absenceClusterMonday: 1,
      unpaidFeeBalance: 65000,
      feePaymentDelayDays: 70,
      academicMarkAverage: 70,
      academicMarkTrend: -2,
      totalExamsTaken: 3,
    };

    const result = predictFeeDefaultRisk(vector);
    expect(result.riskLevel).toBe("critical");
    expect(result.confidenceScore).toBeGreaterThanOrEqual(0.85);
    expect(result.riskFactors.some((f) => f.includes("Severe fee delinquency"))).toBe(true);
  });
});
