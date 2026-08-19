import { predictAttendanceRisk } from "../attendance-prediction-service";
import { predictFeeDefaultRisk } from "../fee-forecasting-service";
import { predictAcademicRisk } from "../academic-prediction-service";
import type { StudentFeatureVector } from "../feature-extractor";

describe("Sprint-008 AI Inference Performance Benchmarks", () => {
  it("executes 1,000 multi-domain prediction inferences in under 500ms", () => {
    const vectors: StudentFeatureVector[] = Array.from({ length: 1000 }, (_, i) => ({
      studentId: `stu_bench_${i}`,
      institutionId: "inst_bench",
      studentName: `Student ${i}`,
      attendanceRate30d: 60 + (i % 40),
      attendanceRate90d: 70 + (i % 30),
      absenceClusterMonday: i % 5,
      unpaidFeeBalance: (i % 10) * 10000,
      feePaymentDelayDays: (i % 15) * 5,
      academicMarkAverage: 30 + (i % 60),
      academicMarkTrend: (i % 20) - 10,
      totalExamsTaken: (i % 5) + 1,
    }));

    const startTime = Date.now();

    for (const vec of vectors) {
      predictAttendanceRisk(vec);
      predictFeeDefaultRisk(vec);
      predictAcademicRisk(vec);
    }

    const duration = Date.now() - startTime;
    expect(duration).toBeLessThan(500); // Must execute 3,000 predictions in < 500ms
  });
});
