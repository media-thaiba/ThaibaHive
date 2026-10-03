import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth-guard";
import { InferenceService } from "@/lib/analytics/inference-service";

const inferenceService = new InferenceService();

export const GET = requireAuth(async (request: Request, session) => {
  try {
    const tenantId = (session as any).institutionId || "inst-001";

    const mockStudents = [
      { studentId: "stu-101", tenantId, attendanceRate: 0.55, assignmentAvgScore: 50, examAvgScore: 48, lmsLoginCountLast30Days: 3, feeOverdueDays: 45, disciplinaryEventsCount: 1 },
      { studentId: "stu-102", tenantId, attendanceRate: 0.62, assignmentAvgScore: 58, examAvgScore: 52, lmsLoginCountLast30Days: 5, feeOverdueDays: 0, disciplinaryEventsCount: 0 },
      { studentId: "stu-103", tenantId, attendanceRate: 0.95, assignmentAvgScore: 92, examAvgScore: 88, lmsLoginCountLast30Days: 25, feeOverdueDays: 0, disciplinaryEventsCount: 0 },
    ];

    const results = await Promise.all(mockStudents.map((s) => inferenceService.evaluateStudent(s)));
    const atRiskList = results
      .filter((r) => r.assessment.riskLevel === "HIGH" || r.assessment.riskLevel === "MEDIUM")
      .map((r) => ({
        studentId: r.assessment.studentId,
        riskScore: r.assessment.riskScore,
        riskLevel: r.assessment.riskLevel,
        primaryDrivers: r.assessment.primaryRiskDrivers,
        recommendedPath: r.learningPath.pathTitle,
      }));

    return NextResponse.json({
      success: true,
      count: atRiskList.length,
      students: atRiskList,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}, "analytics:read");
