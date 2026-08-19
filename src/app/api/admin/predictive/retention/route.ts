import { NextResponse } from "next/server";
import { requireAuth } from "../../../../../lib/api/auth-guard";
import { defaultRetentionPredictor } from "../../../../../lib/predictive/student-retention-predictor";

export const GET = requireAuth(async (request: Request) => {
  const { searchParams } = new URL(request.url);
  const campusId = searchParams.get("campusId") || "inst-001";

  try {
    const mockStudents = [
      { studentId: "std-001", studentName: "Ahmad Hassan", campusId, absenteeismRatePct: 24.5, gradeDropPct: 18.0, feeDelayDays: 45 },
      { studentId: "std-002", studentName: "Fatima Zahra", campusId, absenteeismRatePct: 5.0, gradeDropPct: 2.0, feeDelayDays: 0 },
      { studentId: "std-003", studentName: "Omar Khalid", campusId, absenteeismRatePct: 15.0, gradeDropPct: 12.0, feeDelayDays: 20 },
      { studentId: "std-004", studentName: "Zainab Ali", campusId, absenteeismRatePct: 32.0, gradeDropPct: 22.5, feeDelayDays: 60 },
    ];

    const result = defaultRetentionPredictor.predictCampusRetention(campusId, mockStudents);
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate retention predictions" },
      { status: 500 }
    );
  }
}, "predictive:retention");
