import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth-guard";
import { ReportGeneratorService } from "@/lib/services/report-generator";
import { getActorInstitutionIds } from "@/lib/api/tenant-scope";

export const POST = requireAuth(async (request, session) => {
  const { staffId } = session;
  const body = await request.json();

  const { type, format, startDate, endDate, classId } = body;

  if (!type || !format) {
    return NextResponse.json({ error: "Missing required fields: type and format" }, { status: 400 });
  }

  if (!["attendance", "finance", "academics"].includes(type)) {
    return NextResponse.json({ error: "Invalid report type" }, { status: 400 });
  }

  if (!["pdf", "excel"].includes(format)) {
    return NextResponse.json({ error: "Invalid format type" }, { status: 400 });
  }

  // Get user's institution
  const actorInstIds = await getActorInstitutionIds(staffId);
  const institutionId = Array.from(actorInstIds)[0];

  if (!institutionId) {
    return NextResponse.json({ error: "No institution associated with this user" }, { status: 400 });
  }

  try {
    const result = await ReportGeneratorService.generateReport(
      institutionId,
      type as any,
      format as any,
      { startDate, endDate, classId }
    );

    return NextResponse.json({
      success: true,
      filePath: result.webPath,
      record: result.record
    });
  } catch (error: any) {
    console.error("[Report Compilation Route Error]", error);
    return NextResponse.json({ error: error.message || "Failed to compile report" }, { status: 500 });
  }
}, "reports:read");
