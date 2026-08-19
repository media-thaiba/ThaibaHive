import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth-guard";

export const GET = requireAuth(async (request: Request, session) => {
  try {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get("studentId") || "STD-1001";

    return NextResponse.json({
      success: true,
      student: {
        id: studentId,
        name: "Zayd Mohammed",
        grade: "Grade 10 - Sec A",
        registerNumber: "TH-2026-CS-042",
        attendancePercentage: 96.5,
        pendingFeeBalance: 0.0,
        latestSgpa: 9.40,
        latestCgpa: 9.25,
      },
      announcements: [
        {
          id: "ann-01",
          title: "Annual Sports Meet Scheduled for Aug 15",
          date: "2026-07-30",
        },
      ],
      children: [
        { id: "STD-1001", name: "Zayd Mohammed", grade: "Grade 10 - Sec A" },
        { id: "STD-1002", name: "Sara Mohammed", grade: "Grade 6 - Sec B" },
      ],
    });
  } catch (error) {
    console.error("Student 360 API error:", error);
    return NextResponse.json({ error: "Failed to fetch student 360 data" }, { status: 500 });
  }
});
